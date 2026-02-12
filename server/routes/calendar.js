import express from 'express';
import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { supabase } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Google OAuth2 Client
const getGoogleOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
};

// Microsoft MSAL Client
const getMsalClient = () => {
    return new ConfidentialClientApplication({
        auth: {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            authority: 'https://login.microsoftonline.com/common'
        }
    });
};

/**
 * Middleware to verify authentication
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/calendar/connect/google
 * Initiate Google OAuth flow
 */
router.get('/connect/google', authenticate, (req, res) => {
    try {
        const oauth2Client = getGoogleOAuth2Client();

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/userinfo.email'
            ],
            state: req.user.id // Pass user ID to callback
        });

        res.json({ authUrl });
    } catch (error) {
        console.error('Google OAuth init error:', error);
        res.status(500).json({ error: 'Failed to initiate Google OAuth' });
    }
});

/**
 * GET /api/calendar/callback/google
 * Handle Google OAuth callback
 */
router.get('/callback/google', async (req, res) => {
    try {
        const { code, state: userId } = req.query;

        if (!code || !userId) {
            return res.status(400).send('Missing authorization code or user ID');
        }

        const oauth2Client = getGoogleOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        // Store tokens in Supabase
        const { error } = await supabase
            .from('profiles')
            .update({
                google_tokens: tokens,
                connected_apps: supabase.raw(`
          jsonb_set(
            COALESCE(connected_apps, '{}'::jsonb),
            '{google}',
            'true'::jsonb
          )
        `)
            })
            .eq('id', userId);

        if (error) {
            console.error('Failed to store Google tokens:', error);
            return res.status(500).send('Failed to save credentials');
        }

        // Redirect to frontend success page
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?calendar=google&status=success`);
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.status(500).send('OAuth callback failed');
    }
});

/**
 * GET /api/calendar/connect/outlook
 * Initiate Microsoft OAuth flow
 */
router.get('/connect/outlook', authenticate, async (req, res) => {
    try {
        const msalClient = getMsalClient();

        const authCodeUrlParameters = {
            scopes: ['Calendars.Read', 'User.Read'],
            redirectUri: process.env.MICROSOFT_REDIRECT_URI,
            state: req.user.id
        };

        const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
        res.json({ authUrl });
    } catch (error) {
        console.error('Microsoft OAuth init error:', error);
        res.status(500).json({ error: 'Failed to initiate Microsoft OAuth' });
    }
});

/**
 * GET /api/calendar/callback/outlook
 * Handle Microsoft OAuth callback
 */
router.get('/callback/outlook', async (req, res) => {
    try {
        const { code, state: userId } = req.query;

        if (!code || !userId) {
            return res.status(400).send('Missing authorization code or user ID');
        }

        const msalClient = getMsalClient();

        const tokenRequest = {
            code,
            scopes: ['Calendars.Read', 'User.Read'],
            redirectUri: process.env.MICROSOFT_REDIRECT_URI
        };

        const response = await msalClient.acquireTokenByCode(tokenRequest);

        // Store tokens in Supabase
        const { error } = await supabase
            .from('profiles')
            .update({
                outlook_tokens: {
                    accessToken: response.accessToken,
                    refreshToken: response.refreshToken || null,
                    expiresOn: response.expiresOn
                },
                connected_apps: supabase.raw(`
          jsonb_set(
            COALESCE(connected_apps, '{}'::jsonb),
            '{outlook}',
            'true'::jsonb
          )
        `)
            })
            .eq('id', userId);

        if (error) {
            console.error('Failed to store Outlook tokens:', error);
            return res.status(500).send('Failed to save credentials');
        }

        // Redirect to frontend success page
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?calendar=outlook&status=success`);
    } catch (error) {
        console.error('Microsoft OAuth callback error:', error);
        res.status(500).send('OAuth callback failed');
    }
});

/**
 * GET /api/calendar/events
 * Fetch calendar events from connected calendars
 */
router.get('/events', authenticate, async (req, res) => {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('google_tokens, outlook_tokens, connected_apps')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const events = [];

        // Fetch Google Calendar events
        if (profile.google_tokens) {
            try {
                const oauth2Client = getGoogleOAuth2Client();
                oauth2Client.setCredentials(profile.google_tokens);

                const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: new Date().toISOString(),
                    maxResults: 20,
                    singleEvents: true,
                    orderBy: 'startTime'
                });

                const googleEvents = response.data.items?.map(event => ({
                    id: event.id,
                    title: event.summary || 'Untitled Event',
                    startTime: event.start?.dateTime || event.start?.date,
                    endTime: event.end?.dateTime || event.end?.date,
                    link: event.hangoutLink || extractMeetingLink(event.description),
                    platform: detectPlatform(event.hangoutLink || event.description),
                    source: 'google'
                })) || [];

                events.push(...googleEvents);
            } catch (error) {
                console.error('Google Calendar fetch error:', error);
            }
        }

        // Fetch Outlook Calendar events
        if (profile.outlook_tokens) {
            try {
                const client = Client.init({
                    authProvider: (done) => {
                        done(null, profile.outlook_tokens.accessToken);
                    }
                });

                const response = await client
                    .api('/me/calendar/events')
                    .select('subject,start,end,onlineMeeting,body')
                    .filter(`start/dateTime ge '${new Date().toISOString()}'`)
                    .top(20)
                    .orderby('start/dateTime')
                    .get();

                const outlookEvents = response.value?.map(event => ({
                    id: event.id,
                    title: event.subject || 'Untitled Event',
                    startTime: event.start?.dateTime,
                    endTime: event.end?.dateTime,
                    link: event.onlineMeeting?.joinUrl || extractMeetingLink(event.body?.content),
                    platform: detectPlatform(event.onlineMeeting?.joinUrl || event.body?.content),
                    source: 'outlook'
                })) || [];

                events.push(...outlookEvents);
            } catch (error) {
                console.error('Outlook Calendar fetch error:', error);
            }
        }

        // Sort by start time
        events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        res.json({ events });
    } catch (error) {
        console.error('Fetch events error:', error);
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
});

/**
 * DELETE /api/calendar/disconnect/:provider
 * Disconnect a calendar provider
 */
router.delete('/disconnect/:provider', authenticate, async (req, res) => {
    try {
        const { provider } = req.params;

        if (!['google', 'outlook'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        const tokenField = provider === 'google' ? 'google_tokens' : 'outlook_tokens';

        const { error } = await supabase
            .from('profiles')
            .update({
                [tokenField]: null,
                connected_apps: supabase.raw(`
          jsonb_set(
            COALESCE(connected_apps, '{}'::jsonb),
            '{${provider}}',
            'false'::jsonb
          )
        `)
            })
            .eq('id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: `${provider} calendar disconnected successfully` });
    } catch (error) {
        console.error('Disconnect calendar error:', error);
        res.status(500).json({ error: 'Failed to disconnect calendar' });
    }
});

/**
 * Helper: Extract meeting link from text
 */
function extractMeetingLink(text) {
    if (!text) return null;

    const patterns = [
        /https:\/\/meet\.google\.com\/[a-z-]+/i,
        /https:\/\/zoom\.us\/j\/\d+/i,
        /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[0];
    }

    return null;
}

/**
 * Helper: Detect meeting platform from link
 */
function detectPlatform(link) {
    if (!link) return 'other';
    if (link.includes('meet.google.com')) return 'google_meet';
    if (link.includes('zoom.us')) return 'zoom';
    if (link.includes('teams.microsoft.com')) return 'teams';
    return 'other';
}

export default router;

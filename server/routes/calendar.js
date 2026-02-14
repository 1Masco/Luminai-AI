import express from 'express';
import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { supabase } from '../config/supabase.js';
import { validateQuery, validateParams } from '../validation/middleware.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  CallbackQuerySchema,
  DisconnectCalendarParamsSchema,
} from '../validation/schemas.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';
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
 * GET /api/calendar/connect/google
 * Initiate Google OAuth flow
 */
router.get(
  '/connect/google',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.info('Google OAuth init', { userId, requestId: req.id });

    try {
      const oauth2Client = getGoogleOAuth2Client();

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        state: userId // Pass user ID to callback
      });

      logger.debug('Google OAuth URL generated', { userId, requestId: req.id });

      res.json({ authUrl });
    } catch (error) {
      logger.error('Google OAuth init error', { error: error.message, requestId: req.id });
      throw AppErrors.EXTERNAL_SERVICE_ERROR('Google Calendar');
    }
  })
);

/**
 * GET /api/calendar/callback/google
 * Handle Google OAuth callback
 */
router.get(
  '/callback/google',
  validateQuery(CallbackQuerySchema),
  asyncHandler(async (req, res) => {
    const { code, state: userId } = req.query;

    logger.info('Google OAuth callback', { userId, requestId: req.id });

    try {
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
        logger.error('Failed to store Google tokens', { userId, error: error.message, requestId: req.id });
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?calendar=google&status=error`);
      }

      logger.info('Google tokens stored', { userId, requestId: req.id });

      // Redirect to frontend success page
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?calendar=google&status=success`);
    } catch (error) {
      logger.error('Google OAuth callback error', { error: error.message, requestId: req.id });
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?calendar=google&status=error`);
    }
  })
);

/**
 * GET /api/calendar/connect/outlook
 * Initiate Microsoft OAuth flow
 */
router.get(
  '/connect/outlook',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.info('Outlook OAuth init', { userId, requestId: req.id });

    try {
      const msalClient = getMsalClient();

      const authCodeUrlParameters = {
        scopes: ['Calendars.Read', 'User.Read'],
        redirectUri: process.env.MICROSOFT_REDIRECT_URI,
        state: userId
      };

      const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);

      logger.debug('Outlook OAuth URL generated', { userId, requestId: req.id });

      res.json({ authUrl });
    } catch (error) {
      logger.error('Outlook OAuth init error', { error: error.message, requestId: req.id });
      throw AppErrors.EXTERNAL_SERVICE_ERROR('Outlook');
    }
  })
);

/**
 * GET /api/calendar/callback/outlook
 * Handle Microsoft OAuth callback
 */
router.get(
  '/callback/outlook',
  validateQuery(CallbackQuerySchema),
  asyncHandler(async (req, res) => {
    const { code, state: userId } = req.query;

    logger.info('Outlook OAuth callback', { userId, requestId: req.id });

    try {
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
        logger.error('Failed to store Outlook tokens', { userId, error: error.message, requestId: req.id });
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?calendar=outlook&status=error`);
      }

      logger.info('Outlook tokens stored', { userId, requestId: req.id });

      // Redirect to frontend success page
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?calendar=outlook&status=success`);
    } catch (error) {
      logger.error('Outlook OAuth callback error', { error: error.message, requestId: req.id });
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?calendar=outlook&status=error`);
    }
  })
);

/**
 * GET /api/calendar/events
 * Fetch calendar events from connected calendars
 */
router.get(
  '/events',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.info('Calendar events fetch', { userId, requestId: req.id });

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('google_tokens, outlook_tokens, connected_apps')
        .eq('id', userId)
        .single();

      if (profileError) {
        logger.warn('Profile not found', { userId, requestId: req.id });
        throw AppErrors.NOT_FOUND('Profile');
      }

      const events = [];

      // Fetch Google Calendar events
      if (profile.google_tokens) {
        try {
          logger.debug('Fetching Google Calendar events', { userId, requestId: req.id });

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

          logger.info('Google Calendar events fetched', { userId, count: googleEvents.length, requestId: req.id });
        } catch (error) {
          logger.warn('Google Calendar fetch error', { userId, error: error.message, requestId: req.id });
          // Continue with other calendars on error
        }
      }

      // Fetch Outlook Calendar events
      if (profile.outlook_tokens) {
        try {
          logger.debug('Fetching Outlook events', { userId, requestId: req.id });

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

          logger.info('Outlook events fetched', { userId, count: outlookEvents.length, requestId: req.id });
        } catch (error) {
          logger.warn('Outlook Calendar fetch error', { userId, error: error.message, requestId: req.id });
          // Continue with other calendars on error
        }
      }

      // Sort by start time
      events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      logger.info('Calendar events retrieved', { userId, totalEvents: events.length, requestId: req.id });

      res.json({ events });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Fetch events error', { error: error.message, requestId: req.id });
      throw AppErrors.EXTERNAL_SERVICE_ERROR('Calendar');
    }
  })
);

/**
 * DELETE /api/calendar/disconnect/:provider
 * Disconnect a calendar provider
 */
router.delete(
  '/disconnect/:provider',
  authenticateToken,
  validateParams(DisconnectCalendarParamsSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { provider } = req.params;

    logger.info('Calendar disconnect', { provider, userId, requestId: req.id });

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
      .eq('id', userId);

    if (error) {
      logger.error('Failed to disconnect calendar', { provider, userId, error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.info('Calendar disconnected', { provider, userId, requestId: req.id });

    res.json({ message: `${provider} calendar disconnected successfully` });
  })
);

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

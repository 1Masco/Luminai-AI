import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

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
 * GET /api/sharing/shared-with-me
 * Get all meetings shared with the current user
 */
router.get('/shared-with-me', authenticate, async (req, res) => {
    try {
        const { data: sharedItems, error } = await supabase
            .from('shared_meetings')
            .select(`
                id,
                permission,
                viewed_at,
                created_at,
                shared_by_name,
                shared_by_email,
                meeting:meetings (
                    id,
                    title,
                    date,
                    duration,
                    summary,
                    sentiment,
                    transcript
                )
            `)
            .eq('shared_with_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch shared meetings error:', error);
            return res.status(400).json({ error: error.message });
        }

        // Flatten the response
        const items = (sharedItems || []).map(item => ({
            shareId: item.id,
            permission: item.permission,
            viewedAt: item.viewed_at,
            sharedAt: item.created_at,
            sharedBy: item.shared_by_name,
            sharedByEmail: item.shared_by_email,
            meeting: item.meeting
        }));

        res.json({ sharedItems: items });
    } catch (error) {
        console.error('Fetch shared meetings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/sharing/share
 * Share a meeting with another user by email
 */
router.post('/share', authenticate, async (req, res) => {
    try {
        const { meetingId, email, permission = 'view' } = req.body;

        if (!meetingId || !email) {
            return res.status(400).json({ error: 'Meeting ID and email are required' });
        }

        // Verify the current user owns the meeting
        const { data: meeting, error: meetingError } = await supabase
            .from('meetings')
            .select('id, title')
            .eq('id', meetingId)
            .eq('user_id', req.user.id)
            .single();

        if (meetingError || !meeting) {
            return res.status(404).json({ error: 'Meeting not found or you do not own it' });
        }

        // Find the recipient user by email
        const { data: recipientUsers, error: lookupError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id',
                // Look up user ID from auth.users via email
                (await supabase.auth.admin.listUsers()).data?.users?.find(u => u.email === email)?.id || ''
            )
            .single();

        if (lookupError || !recipientUsers) {
            return res.status(404).json({ error: 'User with that email not found. They need a Lumina account.' });
        }

        const recipientId = recipientUsers.id;

        // Prevent sharing with yourself
        if (recipientId === req.user.id) {
            return res.status(400).json({ error: 'You cannot share a meeting with yourself' });
        }

        // Get sharer's profile name
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', req.user.id)
            .single();

        // Create the share
        const { data: share, error: shareError } = await supabase
            .from('shared_meetings')
            .upsert({
                meeting_id: meetingId,
                owner_id: req.user.id,
                shared_with_id: recipientId,
                shared_by_name: profile?.name || req.user.email || 'Unknown',
                shared_by_email: req.user.email,
                permission
            }, {
                onConflict: 'meeting_id,shared_with_id'
            })
            .select()
            .single();

        if (shareError) {
            console.error('Share meeting error:', shareError);
            return res.status(400).json({ error: shareError.message });
        }

        res.status(201).json({ share, message: `Meeting shared with ${email}` });
    } catch (error) {
        console.error('Share meeting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/sharing/unshare/:shareId
 * Remove a share (owner) or remove from shared list (recipient)
 */
router.delete('/unshare/:shareId', authenticate, async (req, res) => {
    try {
        const { shareId } = req.params;

        const { error } = await supabase
            .from('shared_meetings')
            .delete()
            .eq('id', shareId)
            .or(`owner_id.eq.${req.user.id},shared_with_id.eq.${req.user.id}`);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Share removed successfully' });
    } catch (error) {
        console.error('Unshare error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/sharing/mark-viewed/:shareId
 * Mark a shared meeting as viewed
 */
router.put('/mark-viewed/:shareId', authenticate, async (req, res) => {
    try {
        const { shareId } = req.params;

        const { data, error } = await supabase
            .from('shared_meetings')
            .update({ viewed_at: new Date().toISOString() })
            .eq('id', shareId)
            .eq('shared_with_id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ share: data });
    } catch (error) {
        console.error('Mark viewed error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/sharing/shares/:meetingId
 * Get all shares for a specific meeting (owner only)
 */
router.get('/shares/:meetingId', authenticate, async (req, res) => {
    try {
        const { meetingId } = req.params;

        const { data: shares, error } = await supabase
            .from('shared_meetings')
            .select('id, shared_by_name, shared_by_email, permission, created_at')
            .eq('meeting_id', meetingId)
            .eq('owner_id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ shares: shares || [] });
    } catch (error) {
        console.error('Fetch shares error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

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
 * GET /api/meetings
 * Get all meetings for the authenticated user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { data: meetings, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('user_id', req.user.id)
            .order('date', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ meetings });
    } catch (error) {
        console.error('Fetch meetings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/meetings/:id
 * Get a specific meeting
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: meeting, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json({ meeting });
    } catch (error) {
        console.error('Fetch meeting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/meetings
 * Create a new meeting
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, date, duration, transcript, summary, action_items, sentiment } = req.body;

        if (!title || !date) {
            return res.status(400).json({ error: 'Title and date are required' });
        }

        const { data: meeting, error } = await supabase
            .from('meetings')
            .insert({
                user_id: req.user.id,
                title,
                date,
                duration: duration || 0,
                transcript: transcript || [],
                summary,
                action_items,
                sentiment
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ meeting });
    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/meetings/:id
 * Update a meeting
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, duration, transcript, summary, action_items, sentiment } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (date !== undefined) updates.date = date;
        if (duration !== undefined) updates.duration = duration;
        if (transcript !== undefined) updates.transcript = transcript;
        if (summary !== undefined) updates.summary = summary;
        if (action_items !== undefined) updates.action_items = action_items;
        if (sentiment !== undefined) updates.sentiment = sentiment;

        const { data: meeting, error } = await supabase
            .from('meetings')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ meeting });
    } catch (error) {
        console.error('Update meeting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/meetings/:id
 * Delete a meeting
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('meetings')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Meeting deleted successfully' });
    } catch (error) {
        console.error('Delete meeting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

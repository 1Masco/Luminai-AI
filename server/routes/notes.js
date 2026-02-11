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
 * GET /api/notes
 * Get all notes for the authenticated user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { data: notes, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', req.user.id)
            .order('date', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ notes });
    } catch (error) {
        console.error('Fetch notes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/notes/:id
 * Get a specific note
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: note, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json({ note });
    } catch (error) {
        console.error('Fetch note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, content, date, folder_id, is_recording } = req.body;

        if (!title || !content || !date) {
            return res.status(400).json({ error: 'Title, content, and date are required' });
        }

        const { data: note, error } = await supabase
            .from('notes')
            .insert({
                user_id: req.user.id,
                title,
                content,
                date,
                folder_id,
                is_recording: is_recording || false
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ note });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/notes/:id
 * Update a note
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, date, folder_id, is_recording } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (date !== undefined) updates.date = date;
        if (folder_id !== undefined) updates.folder_id = folder_id;
        if (is_recording !== undefined) updates.is_recording = is_recording;

        const { data: note, error } = await supabase
            .from('notes')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ note });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

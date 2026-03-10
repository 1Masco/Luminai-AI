import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import requireAdmin from '../middleware/admin.js';
import {
    listManagedKeys,
    getManagedKeyById,
    upsertAdminSetting,
    recordAdminAction,
} from '../services/adminSettings.js';

dotenv.config();

const router = express.Router();
router.use(requireAdmin);

// Helper: get Supabase admin client (service role key bypasses RLS)
function getAdminClient() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return null;
    return createClient(url, serviceKey);
}

// â”€â”€â”€ GET /api/admin/keys â”€â”€â”€
router.get('/keys', async (req, res) => {
    try {
        const keys = await listManagedKeys();
        res.json({ keys });
    } catch (err) {
        console.error('Admin keys error:', err);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});

// â”€â”€â”€ PATCH /api/admin/keys/:id â”€â”€â”€
router.patch('/keys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { value } = req.body || {};
        const keyDef = getManagedKeyById(id);

        if (!keyDef) {
            return res.status(404).json({ error: 'Unknown API key' });
        }

        await upsertAdminSetting(keyDef.envKey, value, req.user?.id);
        res.json({ success: true });
    } catch (err) {
        console.error('Admin update key error:', err);
        res.status(500).json({ error: 'Failed to update API key' });
    }
});

// â”€â”€â”€ POST /api/admin/actions â”€â”€â”€
router.post('/actions', async (req, res) => {
    try {
        const { action, payload } = req.body || {};
        if (!action || typeof action !== 'string') {
            return res.status(400).json({ error: 'Action name is required' });
        }
        await recordAdminAction(action, payload, req.user?.id);
        res.json({ success: true });
    } catch (err) {
        console.error('Admin action error:', err);
        res.status(500).json({ error: 'Failed to record admin action' });
    }
});

// ─── GET /api/admin/stats ───
router.get('/stats', async (req, res) => {
    try {
        const supabase = getAdminClient();
        if (!supabase) {
            // Return mock stats when Supabase is not configured
            return res.json({
                totalUsers: 128,
                totalMeetings: 1_542,
                totalNotes: 3_210,
                storageUsedMB: 4_820,
                activeSessions: 34,
                newUsersThisWeek: 12,
                meetingsThisWeek: 87,
                avgMeetingDuration: 2340, // seconds
            });
        }

        const [usersRes, meetingsRes, notesRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('meetings').select('id', { count: 'exact', head: true }),
            supabase.from('notes').select('id', { count: 'exact', head: true }),
        ]);

        res.json({
            totalUsers: usersRes.count || 0,
            totalMeetings: meetingsRes.count || 0,
            totalNotes: notesRes.count || 0,
            storageUsedMB: 0,
            activeSessions: 0,
            newUsersThisWeek: 0,
            meetingsThisWeek: 0,
            avgMeetingDuration: 0,
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// ─── GET /api/admin/users ───
router.get('/users', async (req, res) => {
    try {
        const supabase = getAdminClient();
        if (!supabase) {
            return res.json({
                users: [
                    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', avatar: 'https://i.pravatar.cc/150?u=alice', plan: 'pro', status: 'active', meetingCount: 45, createdAt: '2025-11-15' },
                    { id: '2', name: 'Bob Smith', email: 'bob@example.com', avatar: 'https://i.pravatar.cc/150?u=bob', plan: 'free', status: 'active', meetingCount: 12, createdAt: '2025-12-01' },
                    { id: '3', name: 'Carol Williams', email: 'carol@example.com', avatar: 'https://i.pravatar.cc/150?u=carol', plan: 'team', status: 'active', meetingCount: 78, createdAt: '2025-10-20' },
                    { id: '4', name: 'David Lee', email: 'david@example.com', avatar: 'https://i.pravatar.cc/150?u=david', plan: 'free', status: 'suspended', meetingCount: 3, createdAt: '2026-01-05' },
                    { id: '5', name: 'Eva Martinez', email: 'eva@example.com', avatar: 'https://i.pravatar.cc/150?u=eva', plan: 'pro', status: 'active', meetingCount: 56, createdAt: '2025-09-18' },
                    { id: '6', name: 'Frank Chen', email: 'frank@example.com', avatar: 'https://i.pravatar.cc/150?u=frank', plan: 'team', status: 'active', meetingCount: 92, createdAt: '2025-08-22' },
                    { id: '7', name: 'Grace Kim', email: 'grace@example.com', avatar: 'https://i.pravatar.cc/150?u=grace', plan: 'free', status: 'active', meetingCount: 8, createdAt: '2026-02-10' },
                    { id: '8', name: 'Henry Davis', email: 'henry@example.com', avatar: 'https://i.pravatar.cc/150?u=henry', plan: 'pro', status: 'active', meetingCount: 34, createdAt: '2025-12-15' },
                ],
                total: 128,
            });
        }

        const { data, count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(0, 49);

        if (error) throw error;
        res.json({ users: data || [], total: count || 0 });
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ─── GET /api/admin/meetings ───
router.get('/meetings', async (req, res) => {
    try {
        const supabase = getAdminClient();
        if (!supabase) {
            return res.json({ meetings: [], total: 0, message: 'Use client-side meeting data' });
        }

        const { data, count, error } = await supabase
            .from('meetings')
            .select('*', { count: 'exact' })
            .order('date', { ascending: false })
            .range(0, 49);

        if (error) throw error;
        res.json({ meetings: data || [], total: count || 0 });
    } catch (err) {
        console.error('Admin meetings error:', err);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

// ─── DELETE /api/admin/meetings/:id ───
router.delete('/meetings/:id', async (req, res) => {
    try {
        const supabase = getAdminClient();
        if (!supabase) {
            return res.json({ success: true, message: 'Mock delete' });
        }

        const { error } = await supabase.from('meetings').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Admin delete meeting error:', err);
        res.status(500).json({ error: 'Failed to delete meeting' });
    }
});

// ─── GET /api/admin/notes ───
router.get('/notes', async (req, res) => {
    try {
        const supabase = getAdminClient();
        if (!supabase) {
            return res.json({ notes: [], total: 0, message: 'Use client-side note data' });
        }

        const { data, count, error } = await supabase
            .from('notes')
            .select('*', { count: 'exact' })
            .order('date', { ascending: false })
            .range(0, 49);

        if (error) throw error;
        res.json({ notes: data || [], total: count || 0 });
    } catch (err) {
        console.error('Admin notes error:', err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// ─── DELETE /api/admin/notes/:id ───
router.delete('/notes/:id', async (req, res) => {
    try {
        const supabase = getAdminClient();
        if (!supabase) {
            return res.json({ success: true, message: 'Mock delete' });
        }

        const { error } = await supabase.from('notes').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Admin delete note error:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// ─── PATCH /api/admin/users/:id ───
router.patch('/users/:id', async (req, res) => {
    try {
        const supabase = getAdminClient();
        if (!supabase) {
            return res.json({ success: true, message: 'Mock update' });
        }

        const { plan, status } = req.body;
        const updates = {};
        if (plan) updates.plan = plan;
        if (status) updates.status = status;

        const { error } = await supabase.from('profiles').update(updates).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Admin update user error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// ─── GET /api/admin/activity ───
router.get('/activity', async (req, res) => {
    try {
        // Always return mock activity for now
        const activities = [
            { id: '1', type: 'user_signup', user: 'Grace Kim', detail: 'New user registered', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
            { id: '2', type: 'meeting_created', user: 'Alice Johnson', detail: 'Recorded "Q1 Planning Session"', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
            { id: '3', type: 'plan_upgrade', user: 'Bob Smith', detail: 'Upgraded from Free to Pro', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
            { id: '4', type: 'meeting_shared', user: 'Frank Chen', detail: 'Shared "Team Standup" with 5 users', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
            { id: '5', type: 'note_created', user: 'Eva Martinez', detail: 'Created note "Action Items - Sprint 12"', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
            { id: '6', type: 'meeting_deleted', user: 'David Lee', detail: 'Deleted "Old Brainstorm"', timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
            { id: '7', type: 'user_login', user: 'Carol Williams', detail: 'Logged in from Chrome on Windows', timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString() },
            { id: '8', type: 'template_created', user: 'Henry Davis', detail: 'Created AI template "Sales Follow-Up"', timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString() },
            { id: '9', type: 'translation', user: 'Alice Johnson', detail: 'Translated meeting to Spanish', timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString() },
            { id: '10', type: 'user_signup', user: 'Ian Foster', detail: 'New user registered', timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString() },
        ];
        res.json({ activities });
    } catch (err) {
        console.error('Admin activity error:', err);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

export default router;

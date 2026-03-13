
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Meeting, Note, UserProfile } from '../types';
import apiService from '../utils/apiService';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';

// ─── Types ─────────────────────────────────────────────
type AdminTab =
    | 'overview'
    | 'users'
    | 'meetings'
    | 'notes'
    | 'settings'
    | 'activity'
    | 'security'
    | 'billing'
    | 'system'
    | 'integrations';

interface AdminPanelProps {
    meetings: Meeting[];
    notes: Note[];
    user: UserProfile;
    onDeleteMeeting: (id: string) => void;
    onDeleteNote: (id: string) => void;
    onUpdateUser: (user: UserProfile) => void;
}

// ─── Mock Data ─────────────────────────────────────────
const MOCK_USERS = [
    { id: '1', name: 'Alice Johnson', email: 'alice@lumina.ai', avatar: 'https://i.pravatar.cc/150?u=alice', plan: 'pro' as const, status: 'active' as const, role: 'owner' as const, meetingCount: 45, joinedDate: '2025-11-15', lastActive: '5m ago' },
    { id: '2', name: 'Bob Smith', email: 'bob@lumina.ai', avatar: 'https://i.pravatar.cc/150?u=bob', plan: 'free' as const, status: 'active' as const, role: 'member' as const, meetingCount: 12, joinedDate: '2025-12-01', lastActive: '1h ago' },
    { id: '3', name: 'Carol Williams', email: 'carol@lumina.ai', avatar: 'https://i.pravatar.cc/150?u=carol', plan: 'team' as const, status: 'active' as const, role: 'admin' as const, meetingCount: 78, joinedDate: '2025-10-20', lastActive: '10m ago' },
    { id: '4', name: 'David Lee', email: 'david@lumina.ai', avatar: 'https://i.pravatar.cc/150?u=david', plan: 'free' as const, status: 'suspended' as const, role: 'member' as const, meetingCount: 3, joinedDate: '2026-01-05', lastActive: '14d ago' },
    { id: '5', name: 'Eva Martinez', email: 'eva@lumina.ai', avatar: 'https://i.pravatar.cc/150?u=eva', plan: 'pro' as const, status: 'active' as const, role: 'admin' as const, meetingCount: 56, joinedDate: '2025-09-18', lastActive: '30m ago' },
    { id: '6', name: 'Frank Chen', email: 'frank@lumina.ai', avatar: 'https://i.pravatar.cc/150?u=frank', plan: 'team' as const, status: 'active' as const, role: 'member' as const, meetingCount: 92, joinedDate: '2025-08-22', lastActive: '2h ago' },
    { id: '7', name: 'Grace Kim', email: 'grace@lumina.ai', avatar: 'https://i.pravatar.cc/150?u=grace', plan: 'free' as const, status: 'active' as const, role: 'support' as const, meetingCount: 8, joinedDate: '2026-02-10', lastActive: '20m ago' },
    { id: '8', name: 'Henry Davis', email: 'henry@lumina.ai', avatar: 'https://i.pravatar.cc/150?u=henry', plan: 'pro' as const, status: 'active' as const, role: 'member' as const, meetingCount: 34, joinedDate: '2025-12-15', lastActive: '1d ago' },
];

const MOCK_ACTIVITY = [
    { id: '1', type: 'user_signup', icon: 'fa-user-plus', color: '#10b981', user: 'Grace Kim', detail: 'New user registered', time: '5 min ago' },
    { id: '2', type: 'meeting_created', icon: 'fa-video', color: '#6366f1', user: 'Alice Johnson', detail: 'Recorded "Q1 Planning Session"', time: '15 min ago' },
    { id: '3', type: 'plan_upgrade', icon: 'fa-arrow-up', color: '#f59e0b', user: 'Bob Smith', detail: 'Upgraded from Free to Pro', time: '45 min ago' },
    { id: '4', type: 'meeting_shared', icon: 'fa-share-nodes', color: '#8b5cf6', user: 'Frank Chen', detail: 'Shared "Team Standup" with 5 users', time: '2 hrs ago' },
    { id: '5', type: 'note_created', icon: 'fa-sticky-note', color: '#06b6d4', user: 'Eva Martinez', detail: 'Created note "Action Items - Sprint 12"', time: '3 hrs ago' },
    { id: '6', type: 'meeting_deleted', icon: 'fa-trash', color: '#ef4444', user: 'David Lee', detail: 'Deleted "Old Brainstorm"', time: '4 hrs ago' },
    { id: '7', type: 'user_login', icon: 'fa-right-to-bracket', color: '#64748b', user: 'Carol Williams', detail: 'Logged in from Chrome on Windows', time: '5 hrs ago' },
    { id: '8', type: 'template_created', icon: 'fa-wand-magic-sparkles', color: '#ec4899', user: 'Henry Davis', detail: 'Created AI template "Sales Follow-Up"', time: '7 hrs ago' },
    { id: '9', type: 'translation', icon: 'fa-language', color: '#14b8a6', user: 'Alice Johnson', detail: 'Translated meeting to Spanish', time: '10 hrs ago' },
    { id: '10', type: 'user_signup', icon: 'fa-user-plus', color: '#10b981', user: 'Ian Foster', detail: 'New user registered', time: '12 hrs ago' },
];

const MOCK_ALERTS = [
    { id: '1', severity: 'critical', title: 'Elevated API errors', detail: '5xx rate exceeded 2% for 10 minutes', time: '12 min ago' },
    { id: '2', severity: 'warning', title: 'Transcription queue delay', detail: 'Median wait time is 4 minutes', time: '32 min ago' },
    { id: '3', severity: 'info', title: 'Deploy completed', detail: 'Version 1.12.0 rolled out to 100%', time: '2 hrs ago' },
];

const MOCK_INVOICES = [
    { id: 'INV-2401', customer: 'Nimbus Ventures', amount: 2400, status: 'paid', date: '2026-02-22', plan: 'team' },
    { id: 'INV-2402', customer: 'Atlas Health', amount: 1290, status: 'paid', date: '2026-02-24', plan: 'pro' },
    { id: 'INV-2403', customer: 'Brightline Studio', amount: 890, status: 'open', date: '2026-02-28', plan: 'pro' },
    { id: 'INV-2404', customer: 'Northwind Labs', amount: 3100, status: 'overdue', date: '2026-03-02', plan: 'team' },
];

const MOCK_SERVICES = [
    { id: 'api', name: 'Public API', status: 'healthy', latencyMs: 142, uptime: '99.98%', incidents: 0 },
    { id: 'worker', name: 'Transcription Workers', status: 'degraded', latencyMs: 420, uptime: '99.71%', incidents: 1 },
    { id: 'storage', name: 'Storage Pipeline', status: 'healthy', latencyMs: 88, uptime: '99.99%', incidents: 0 },
    { id: 'notifications', name: 'Notifications', status: 'healthy', latencyMs: 120, uptime: '99.95%', incidents: 0 },
];

const MOCK_JOBS = [
    { id: 'j1', name: 'Transcript Cleanup', status: 'running', lastRun: '2 min ago', nextRun: 'in 4 min' },
    { id: 'j2', name: 'Daily Usage Rollup', status: 'scheduled', lastRun: '4 hrs ago', nextRun: 'in 20 hrs' },
    { id: 'j3', name: 'Billing Sync', status: 'failed', lastRun: '20 min ago', nextRun: 'retrying' },
    { id: 'j4', name: 'Archive Exports', status: 'idle', lastRun: '1 day ago', nextRun: 'in 6 hrs' },
];

const MOCK_WEBHOOKS = [
    { id: 'wh_01', name: 'Slack Alerts', url: 'https://hooks.slack.com/xxx', status: 'active', lastDelivery: '3 min ago' },
    { id: 'wh_02', name: 'Ops Pager', url: 'https://pager.example.com/xxx', status: 'active', lastDelivery: '12 min ago' },
    { id: 'wh_03', name: 'BI Warehouse', url: 'https://bi.example.com/xxx', status: 'paused', lastDelivery: '2 days ago' },
];

const MOCK_INTEGRATIONS = [
    { id: 'slack', name: 'Slack', description: 'Notify channels about meetings and notes', icon: 'fa-hashtag', color: '#4a154b', status: 'healthy', enabled: true },
    { id: 'google', name: 'Google Calendar', description: 'Sync events and auto-join meetings', icon: 'fa-calendar-day', color: '#2563eb', status: 'healthy', enabled: true },
    { id: 'zoom', name: 'Zoom', description: 'Import recordings and transcripts', icon: 'fa-video', color: '#2563eb', status: 'healthy', enabled: true },
    { id: 'teams', name: 'Microsoft Teams', description: 'Pull meeting metadata and recordings', icon: 'fa-people-group', color: '#4f46e5', status: 'warning', enabled: false },
    { id: 'salesforce', name: 'Salesforce', description: 'Attach insights to opportunities', icon: 'fa-cloud', color: '#0ea5e9', status: 'healthy', enabled: false },
    { id: 'webhooks', name: 'Webhooks', description: 'Push events to your systems', icon: 'fa-link', color: '#0f766e', status: 'healthy', enabled: true },
];

// ─── Helper Components ─────────────────────────────────

const TabButton: React.FC<{ icon: string; label: string; isActive: boolean; onClick: () => void; badge?: number }> = ({ icon, label, isActive, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 relative whitespace-nowrap ${isActive ? 'shadow-lg' : 'hover:scale-[1.02]'
            }`}
        style={isActive
            ? { background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)' }
            : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
        }
    >
        <i className={`fas ${icon} text-xs`}></i>
        <span className="hidden sm:inline">{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {badge > 99 ? '99+' : badge}
            </span>
        )}
    </button>
);

const StatCard: React.FC<{ icon: string; label: string; value: string | number; trend?: string; trendUp?: boolean; gradient: string }> = ({ icon, label, value, trend, trendUp, gradient }) => (
    <div
        className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
    >
        <div className="absolute inset-0 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity" style={{ background: gradient }}></div>
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: gradient }}>
                    <i className={`fas ${icon} text-white text-sm`}></i>
                </div>
                {trend && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        <i className={`fas fa-arrow-${trendUp ? 'up' : 'down'} mr-1 text-[10px]`}></i>
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        </div>
    </div>
);

const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
};

const formatDate = (dateStr: string): string => {
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
};

const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
    const colors: Record<string, { bg: string; text: string }> = {
        free: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
        pro: { bg: 'rgba(99,102,241,0.12)', text: '#6366f1' },
        team: { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6' },
    };
    const c = colors[plan] || colors.free;
    return (
        <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
            {plan}
        </span>
    );
};

const RoleBadge: React.FC<{ role?: string }> = ({ role }) => {
    const colors: Record<string, { bg: string; text: string }> = {
        owner: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
        admin: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
        support: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
        member: { bg: 'rgba(148,163,184,0.16)', text: '#64748b' },
    };
    const key = role || 'member';
    const c = colors[key] || colors.member;
    return (
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
            {key}
        </span>
    );
};

const StatusDot: React.FC<{ status: string }> = ({ status }) => (
    <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
        <span className="text-xs font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>{status}</span>
    </div>
);

const SentimentBadge: React.FC<{ sentiment?: string }> = ({ sentiment }) => {
    if (!sentiment) return <span style={{ color: 'var(--text-tertiary)' }} className="text-xs">—</span>;
    const map: Record<string, { icon: string; color: string; bg: string }> = {
        positive: { icon: 'fa-face-smile', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        neutral: { icon: 'fa-face-meh', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        negative: { icon: 'fa-face-frown', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    };
    const s = map[sentiment] || map.neutral;
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize" style={{ backgroundColor: s.bg, color: s.color }}>
            <i className={`fas ${s.icon} text-[10px]`}></i>
            {sentiment}
        </span>
    );
};

// ─── Settings Feature Flag ─────────────────────────────
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { bg: string; text: string }> = {
        healthy: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
        degraded: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
        warning: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
        info: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
        critical: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
        active: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
        paused: { bg: 'rgba(148,163,184,0.16)', text: '#64748b' },
        paid: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
        open: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
        overdue: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
        running: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
        scheduled: { bg: 'rgba(148,163,184,0.16)', text: '#64748b' },
        failed: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
        idle: { bg: 'rgba(148,163,184,0.16)', text: '#64748b' },
    };
    const c = map[status] || { bg: 'rgba(148,163,184,0.16)', text: '#64748b' };
    return (
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
            {status}
        </span>
    );
};

const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
    <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-brand-500' : ''}`}
        style={!enabled ? { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' } : {}}
    >
        <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${enabled ? 'left-[22px]' : 'left-0.5'}`}
        ></div>
    </button>
);

// ─── Main Component ────────────────────────────────────

const AdminPanel: React.FC<AdminPanelProps> = ({ meetings, notes, user, onDeleteMeeting, onDeleteNote, onUpdateUser }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [userSearch, setUserSearch] = useState('');
    const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
    const [userPlanFilter, setUserPlanFilter] = useState<'all' | 'free' | 'pro' | 'team'>('all');
    const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'owner' | 'admin' | 'support' | 'member'>('all');
    const [meetingSearch, setMeetingSearch] = useState('');
    const [noteSearch, setNoteSearch] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'meeting' | 'note'; id: string } | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [announcementMessage, setAnnouncementMessage] = useState('');

    const [securitySettings, setSecuritySettings] = useState({
        mfaRequired: true,
        ssoEnabled: false,
        ipAllowlist: false,
        allowMagicLinks: true,
        auditRetentionDays: 90,
        deviceTrustDays: 30,
    });

    const [billingSettings, setBillingSettings] = useState({
        trialDays: 14,
        allowCoupons: true,
        autoInvoices: true,
        proration: true,
    });

    const [integrations, setIntegrations] = useState(MOCK_INTEGRATIONS);
    const [adminToken, setAdminToken] = useState<string | null>(null);
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [apiKeysLoading, setApiKeysLoading] = useState(false);
    const [apiKeysError, setApiKeysError] = useState<string | null>(null);
    const [editingKey, setEditingKey] = useState<any | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [showAddKeyModal, setShowAddKeyModal] = useState(false);
    const [newKeyEnv, setNewKeyEnv] = useState('');
    const [newKeyLabel, setNewKeyLabel] = useState('');
    const [newKeyDescription, setNewKeyDescription] = useState('');
    const [newKeyScopes, setNewKeyScopes] = useState('');
    const [createKeyLoading, setCreateKeyLoading] = useState(false);

    // Settings state
    const [settings, setSettings] = useState({
        aiTranscription: true,
        autoTranslation: true,
        meetingRecording: true,
        sentimentAnalysis: true,
        maintenanceMode: false,
        emailNotifications: true,
        pushNotifications: true,
        analyticsCollection: true,
        maxUploadSizeMB: 50,
        rateLimitPerMin: 100,
        sessionTimeoutMins: 60,
    });

    const logAdminAction = useCallback(async (action: string, payload?: any) => {
        try {
            await apiService.logAdminAction(adminToken || undefined, action, payload);
        } catch (error) {
            // Silent fail - logging should not block UI actions
        }
    }, [adminToken]);

    const triggerToast = useCallback((msg: string, payload?: any) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
        logAdminAction('admin_ui', { message: msg, ...(payload || {}) });
    }, [logAdminAction]);

    useEffect(() => {
        if (!isSupabaseConfigured()) return;
        const supabase = getSupabaseClient();

        supabase.auth.getSession().then(({ data }) => {
            setAdminToken(data.session?.access_token || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setAdminToken(session?.access_token || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Computed stats from real data
    const stats = useMemo(() => {
        const totalDuration = meetings.reduce((sum, m) => sum + (m.duration || 0), 0);
        const avgDuration = meetings.length > 0 ? Math.round(totalDuration / meetings.length) : 0;
        const positiveMeetings = meetings.filter(m => m.sentiment === 'positive').length;
        const sentimentRate = meetings.length > 0 ? Math.round((positiveMeetings / meetings.length) * 100) : 0;
        return {
            totalUsers: MOCK_USERS.length,
            totalMeetings: meetings.length,
            totalNotes: notes.length,
            totalDuration,
            avgDuration,
            sentimentRate,
            storageUsedMB: Math.round(meetings.length * 3.2 + notes.length * 0.5),
            activeSessions: 34,
        };
    }, [meetings, notes]);

    const fetchApiKeys = useCallback(async () => {
        setApiKeysLoading(true);
        setApiKeysError(null);
        if (!adminToken && isSupabaseConfigured()) {
            setApiKeys([]);
            setApiKeysError('Sign in as an admin to view API keys.');
            setApiKeysLoading(false);
            return;
        }
        try {
            const response = await apiService.getAdminApiKeys(adminToken || undefined);
            setApiKeys(response?.keys || []);
        } catch (error: any) {
            setApiKeysError(error?.message || 'Failed to load API keys');
        } finally {
            setApiKeysLoading(false);
        }
    }, [adminToken]);

    const updateApiKey = useCallback(async (keyId: string, value: string) => {
        setApiKeysError(null);
        if (!adminToken && isSupabaseConfigured()) {
            setApiKeysError('Sign in as an admin to update API keys.');
            return;
        }
        try {
            await apiService.updateAdminApiKey(adminToken || undefined, keyId, value);
            await fetchApiKeys();
            triggerToast('API key updated', { keyId });
        } catch (error: any) {
            setApiKeysError(error?.message || 'Failed to update API key');
        }
    }, [adminToken, fetchApiKeys, triggerToast]);

    const parseScopes = useCallback((raw: string) => raw
        .split(',')
        .map(scope => scope.trim())
        .filter(Boolean), []);

    const openAddKeyModal = () => {
        setNewKeyEnv('');
        setNewKeyLabel('');
        setNewKeyDescription('');
        setNewKeyScopes('');
        setApiKeysError(null);
        setShowAddKeyModal(true);
    };

    const closeAddKeyModal = () => {
        setShowAddKeyModal(false);
    };

    const createApiKeyDefinition = useCallback(async () => {
        const envKey = newKeyEnv.trim().toUpperCase();
        if (!envKey) {
            setApiKeysError('Provide an ENV key (e.g. MY_PROVIDER_API_KEY).');
            return;
        }
        if (!/^[A-Z][A-Z0-9_]*$/.test(envKey)) {
            setApiKeysError('ENV key must be uppercase letters, numbers, and underscores only.');
            return;
        }
        if (!adminToken && isSupabaseConfigured()) {
            setApiKeysError('Sign in as an admin to add API keys.');
            return;
        }

        setCreateKeyLoading(true);
        setApiKeysError(null);
        try {
            await apiService.createAdminApiKey(adminToken || undefined, {
                envKey,
                label: newKeyLabel.trim() || envKey,
                description: newKeyDescription.trim(),
                scopes: parseScopes(newKeyScopes),
            });
            triggerToast('API key definition added', { envKey });
            closeAddKeyModal();
            await fetchApiKeys();
        } catch (error: any) {
            setApiKeysError(error?.message || 'Failed to add API key definition');
        } finally {
            setCreateKeyLoading(false);
        }
    }, [adminToken, newKeyEnv, newKeyLabel, newKeyDescription, newKeyScopes, fetchApiKeys, triggerToast, parseScopes]);

    const openApiKeyEditor = (key: any) => {
        setEditingKey(key);
        setEditingValue('');
    };

    const closeApiKeyEditor = () => {
        setEditingKey(null);
        setEditingValue('');
    };

    const handleSaveApiKey = async () => {
        if (!editingKey) return;
        const trimmed = editingValue.trim();
        if (!trimmed) {
            setApiKeysError('Enter a key value before saving.');
            return;
        }
        await updateApiKey(editingKey.id, trimmed);
        closeApiKeyEditor();
    };

    useEffect(() => {
        if (activeTab === 'security') {
            fetchApiKeys();
        }
    }, [activeTab, fetchApiKeys]);

    // Filtered users
    const filteredUsers = useMemo(() => {
        const q = userSearch.trim().toLowerCase();
        return MOCK_USERS.filter(u => {
            const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
            const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
            const matchesPlan = userPlanFilter === 'all' || u.plan === userPlanFilter;
            const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
            return matchesSearch && matchesStatus && matchesPlan && matchesRole;
        });
    }, [userSearch, userStatusFilter, userPlanFilter, userRoleFilter]);

    // Filtered meetings
    const filteredMeetings = useMemo(() => {
        if (!meetingSearch.trim()) return meetings;
        const q = meetingSearch.toLowerCase();
        return meetings.filter(m => m.title.toLowerCase().includes(q));
    }, [meetings, meetingSearch]);

    // Filtered notes
    const filteredNotes = useMemo(() => {
        if (!noteSearch.trim()) return notes;
        const q = noteSearch.toLowerCase();
        return notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }, [notes, noteSearch]);

    const handleDeleteConfirm = () => {
        if (!confirmDelete) return;
        if (confirmDelete.type === 'meeting') {
            onDeleteMeeting(confirmDelete.id);
            triggerToast('Meeting deleted successfully');
        } else {
            onDeleteNote(confirmDelete.id);
            triggerToast('Note deleted successfully');
        }
        setConfirmDelete(null);
    };

    const TABS: { key: AdminTab; icon: string; label: string }[] = [
        { key: 'overview', icon: 'fa-gauge-high', label: 'Overview' },
        { key: 'users', icon: 'fa-users-gear', label: 'Users' },
        { key: 'meetings', icon: 'fa-video', label: 'Meetings' },
        { key: 'notes', icon: 'fa-sticky-note', label: 'Notes' },
        { key: 'security', icon: 'fa-shield-halved', label: 'Security' },
        { key: 'billing', icon: 'fa-credit-card', label: 'Billing' },
        { key: 'system', icon: 'fa-server', label: 'System' },
        { key: 'integrations', icon: 'fa-plug', label: 'Integrations' },
        { key: 'settings', icon: 'fa-sliders', label: 'Settings' },
        { key: 'activity', icon: 'fa-clock-rotate-left', label: 'Activity' },
    ];

    // ─── render helpers ──────────────────────────────────

    const renderOverview = () => (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="fa-users" label="Total Users" value={stats.totalUsers.toLocaleString()} trend="+12%" trendUp gradient="linear-gradient(135deg, #6366f1, #8b5cf6)" />
                <StatCard icon="fa-video" label="Total Meetings" value={stats.totalMeetings.toLocaleString()} trend="+8%" trendUp gradient="linear-gradient(135deg, #3b82f6, #06b6d4)" />
                <StatCard icon="fa-sticky-note" label="Total Notes" value={stats.totalNotes.toLocaleString()} trend="+15%" trendUp gradient="linear-gradient(135deg, #10b981, #059669)" />
                <StatCard icon="fa-database" label="Storage Used" value={`${(stats.storageUsedMB / 1000).toFixed(1)} GB`} trend="+5%" trendUp gradient="linear-gradient(135deg, #f59e0b, #d97706)" />
            </div>

            {/* Second row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="fa-clock" label="Avg Duration" value={formatDuration(stats.avgDuration)} gradient="linear-gradient(135deg, #ec4899, #be185d)" />
                <StatCard icon="fa-face-smile" label="Positive Sentiment" value={`${stats.sentimentRate}%`} gradient="linear-gradient(135deg, #14b8a6, #0d9488)" />
                <StatCard icon="fa-bolt" label="Active Sessions" value={stats.activeSessions} gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)" />
                <StatCard icon="fa-shield-halved" label="System Health" value="Healthy" gradient="linear-gradient(135deg, #22c55e, #16a34a)" />
            </div>

            {/* Quick Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Meeting Trends */}
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-chart-line mr-2 text-brand-500"></i>Meeting Trends (Last 7 Days)
                    </h3>
                    <div className="flex items-end gap-2 h-32">
                        {[3, 5, 2, 8, 6, 4, 7].map((val, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full rounded-lg transition-all duration-500 hover:opacity-80"
                                    style={{
                                        height: `${(val / 8) * 100}%`,
                                        background: i === 6 ? 'linear-gradient(180deg, #6366f1, #4f46e5)' : 'var(--bg-tertiary)',
                                        minHeight: '8px',
                                    }}
                                ></div>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Plan Distribution */}
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-chart-pie mr-2 text-purple-500"></i>Plan Distribution
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Free', count: 3, total: 8, color: '#64748b' },
                            { label: 'Pro', count: 3, total: 8, color: '#6366f1' },
                            { label: 'Team', count: 2, total: 8, color: '#8b5cf6' },
                        ].map(p => (
                            <div key={p.label}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                                    <span className="text-xs font-bold" style={{ color: p.color }}>{p.count} users ({Math.round((p.count / p.total) * 100)}%)</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(p.count / p.total) * 100}%`, backgroundColor: p.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Operational Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-wand-magic-sparkles mr-2 text-indigo-500"></i>Quick Actions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => triggerToast('Export started - you will receive a download link')}
                            className="px-3 py-2 rounded-xl text-xs font-semibold"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                            Export Data
                        </button>
                        <button
                            onClick={() => triggerToast('Queued background reindex')}
                            className="px-3 py-2 rounded-xl text-xs font-semibold"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                            Reindex Search
                        </button>
                        <button
                            onClick={() => triggerToast('Rotated service API keys')}
                            className="px-3 py-2 rounded-xl text-xs font-semibold"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                            Rotate Keys
                        </button>
                        <button
                            onClick={() => triggerToast('Forced logout issued to all sessions')}
                            className="px-3 py-2 rounded-xl text-xs font-semibold"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                            Force Logout All
                        </button>
                    </div>
                    <div className="mt-5">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                            Announcement
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={announcementMessage}
                                onChange={(e) => setAnnouncementMessage(e.target.value)}
                                placeholder="Broadcast an update to all users..."
                                className="flex-1 px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                            />
                            <button
                                onClick={() => {
                                    if (!announcementMessage.trim()) return;
                                    triggerToast('Announcement sent');
                                    setAnnouncementMessage('');
                                }}
                                disabled={!announcementMessage.trim()}
                                className="px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                                style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-triangle-exclamation mr-2 text-red-500"></i>Active Alerts
                    </h3>
                    <div className="space-y-3">
                        {MOCK_ALERTS.map(alert => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <div className="mt-0.5">
                                    <StatusPill status={alert.severity} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{alert.title}</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{alert.detail}</p>
                                </div>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{alert.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-zap mr-2 text-amber-500"></i>Recent Activity
                    </h3>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                    >
                        View All <i className="fas fa-arrow-right ml-1 text-[10px]"></i>
                    </button>
                </div>
                <div className="space-y-3">
                    {MOCK_ACTIVITY.slice(0, 4).map(a => (
                        <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl hover:scale-[1.01] transition-all" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${a.color}15`, color: a.color }}>
                                <i className={`fas ${a.icon} text-xs`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{a.user}</span> · {a.detail}
                                </p>
                            </div>
                            <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{a.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="space-y-4 animate-fade-in">
            {/* Search */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 relative min-w-[220px]">
                    <i className="fas fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-tertiary)' }}></i>
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-all"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                    />
                </div>
                <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as any)}
                    className="px-3 py-3 rounded-xl text-xs font-semibold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
                <select
                    value={userPlanFilter}
                    onChange={(e) => setUserPlanFilter(e.target.value as any)}
                    className="px-3 py-3 rounded-xl text-xs font-semibold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                >
                    <option value="all">All Plans</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="team">Team</option>
                </select>
                <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as any)}
                    className="px-3 py-3 rounded-xl text-xs font-semibold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                >
                    <option value="all">All Roles</option>
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                    <option value="member">Member</option>
                </select>
                <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    {filteredUsers.length} users
                </div>
            </div>

            {/* User Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredUsers.map(u => (
                    <div
                        key={u.id}
                        className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 hover:shadow-lg hover:scale-[1.01] group"
                        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
                    >
                        <div className="relative flex-shrink-0">
                            <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-xl object-cover border-2" style={{ borderColor: 'var(--border-primary)' }}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${u.status === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ borderColor: 'var(--card-bg)' }}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                                <PlanBadge plan={u.plan} />
                                <RoleBadge role={u.role} />
                            </div>
                            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{u.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                    <i className="fas fa-video mr-1 text-[10px]"></i>{u.meetingCount} meetings
                                </span>
                                <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                    <i className="fas fa-calendar mr-1 text-[10px]"></i>Joined {formatDate(u.joinedDate)}
                                </span>
                                <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                    <i className="fas fa-clock mr-1 text-[10px]"></i>Active {u.lastActive}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title="Edit user"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                onClick={() => triggerToast(`Edit ${u.name} — coming soon`)}
                            >
                                <i className="fas fa-pen text-[10px]"></i>
                            </button>
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title="Reset password"
                                style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                                onClick={() => triggerToast(`Password reset sent to ${u.email}`)}
                            >
                                <i className="fas fa-key text-[10px]"></i>
                            </button>
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title="Force logout"
                                style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                                onClick={() => triggerToast(`Forced logout for ${u.name}`)}
                            >
                                <i className="fas fa-right-from-bracket text-[10px]"></i>
                            </button>
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title={u.status === 'active' ? 'Suspend user' : 'Activate user'}
                                style={{ backgroundColor: u.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.status === 'active' ? '#ef4444' : '#10b981' }}
                                onClick={() => triggerToast(`${u.status === 'active' ? 'Suspended' : 'Activated'} ${u.name}`)}
                            >
                                <i className={`fas ${u.status === 'active' ? 'fa-ban' : 'fa-check'} text-[10px]`}></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                    <i className="fas fa-users-slash text-3xl mb-3" style={{ color: 'var(--text-tertiary)' }}></i>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No users found</p>
                </div>
            )}
        </div>
    );

    const renderMeetings = () => (
        <div className="space-y-4 animate-fade-in">
            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <i className="fas fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-tertiary)' }}></i>
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        value={meetingSearch}
                        onChange={(e) => setMeetingSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-all"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                    />
                </div>
                <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    {filteredMeetings.length} meetings
                </div>
            </div>

            {/* Meeting Table */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                    <div className="col-span-4">Title</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">Duration</div>
                    <div className="col-span-2">Sentiment</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
                {/* Rows */}
                <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {filteredMeetings.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-video-slash text-3xl mb-3" style={{ color: 'var(--text-tertiary)' }}></i>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No meetings found</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Meetings recorded in the app will appear here</p>
                        </div>
                    ) : (
                        filteredMeetings.map(m => (
                            <div key={m.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:scale-[1.005] transition-all group items-center">
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))', color: '#6366f1' }}>
                                        <i className="fas fa-video text-xs"></i>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{m.title}</p>
                                        <p className="text-[11px] md:hidden" style={{ color: 'var(--text-tertiary)' }}>{formatDate(m.date)} · {formatDuration(m.duration)}</p>
                                    </div>
                                </div>
                                <div className="hidden md:block col-span-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{formatDate(m.date)}</div>
                                <div className="hidden md:block col-span-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{formatDuration(m.duration)}</div>
                                <div className="hidden md:block col-span-2"><SentimentBadge sentiment={m.sentiment} /></div>
                                <div className="col-span-2 flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                        title="Delete meeting"
                                        style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                        onClick={() => setConfirmDelete({ type: 'meeting', id: m.id })}
                                    >
                                        <i className="fas fa-trash text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const renderNotes = () => (
        <div className="space-y-4 animate-fade-in">
            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <i className="fas fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-tertiary)' }}></i>
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-all"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                    />
                </div>
                <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    {filteredNotes.length} notes
                </div>
            </div>

            {/* Notes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <i className="fas fa-note-sticky text-3xl mb-3" style={{ color: 'var(--text-tertiary)' }}></i>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No notes found</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Notes created in the app will appear here</p>
                    </div>
                ) : (
                    filteredNotes.map(n => (
                        <div
                            key={n.id}
                            className="rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] group relative"
                            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(20,184,166,0.12))', color: '#06b6d4' }}>
                                        <i className={`fas ${n.isRecording ? 'fa-microphone' : 'fa-file-lines'} text-xs`}></i>
                                    </div>
                                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                                </div>
                                <button
                                    className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                    onClick={() => setConfirmDelete({ type: 'note', id: n.id })}
                                    title="Delete note"
                                >
                                    <i className="fas fa-trash text-[10px]"></i>
                                </button>
                            </div>
                            <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-tertiary)' }}>{n.content}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                                    <i className="fas fa-calendar mr-1"></i>{formatDate(n.date)}
                                </span>
                                {n.isRecording && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                        <i className="fas fa-microphone mr-1"></i>Recording
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderSecurity = () => {
        const adminCount = MOCK_USERS.filter(u => u.role === 'admin' || u.role === 'owner').length;
        const activeApiKeyCount = apiKeys.filter((key) => key?.isSet).length;
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="fa-shield-halved" label="Admin Accounts" value={adminCount} gradient="linear-gradient(135deg, #10b981, #059669)" />
                    <StatCard icon="fa-lock" label="MFA Coverage" value="68%" trend="+6%" trendUp gradient="linear-gradient(135deg, #6366f1, #4f46e5)" />
                    <StatCard icon="fa-triangle-exclamation" label="Failed Logins (24h)" value="14" trend="-3%" gradient="linear-gradient(135deg, #f59e0b, #d97706)" />
                    <StatCard icon="fa-key" label="Active API Keys" value={activeApiKeyCount} gradient="linear-gradient(135deg, #0ea5e9, #2563eb)" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                        <h3 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <i className="fas fa-shield-halved text-emerald-500"></i>Access Controls
                        </h3>
                        <div className="space-y-4">
                            {[
                                { key: 'mfaRequired', label: 'Require MFA', desc: 'All users must enroll in multi-factor authentication', icon: 'fa-key' },
                                { key: 'ssoEnabled', label: 'SSO Enforcement', desc: 'Restrict login to single sign-on providers', icon: 'fa-right-to-bracket' },
                                { key: 'ipAllowlist', label: 'IP Allowlist', desc: 'Limit admin access to approved IP ranges', icon: 'fa-shield' },
                                { key: 'allowMagicLinks', label: 'Allow Magic Links', desc: 'Enable passwordless sign-in links', icon: 'fa-link' },
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl transition-all" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                                            <i className={`fas ${item.icon} text-xs`}></i>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        enabled={(securitySettings as any)[item.key]}
                                        onToggle={() => {
                                            setSecuritySettings(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }));
                                            triggerToast(`${item.label} ${(securitySettings as any)[item.key] ? 'disabled' : 'enabled'}`);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                        <h3 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <i className="fas fa-clock text-indigo-500"></i>Sessions & Retention
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Session Timeout (min)</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Auto sign out inactive sessions</p>
                                </div>
                                <input
                                    type="number"
                                    value={settings.sessionTimeoutMins}
                                    onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeoutMins: parseInt(e.target.value) || 0 }))}
                                    className="w-24 text-right text-sm font-bold px-3 py-2 rounded-lg"
                                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Audit Retention (days)</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>How long audit logs are stored</p>
                                </div>
                                <input
                                    type="number"
                                    value={securitySettings.auditRetentionDays}
                                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, auditRetentionDays: parseInt(e.target.value) || 0 }))}
                                    className="w-24 text-right text-sm font-bold px-3 py-2 rounded-lg"
                                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Device Trust (days)</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Remember trusted devices</p>
                                </div>
                                <input
                                    type="number"
                                    value={securitySettings.deviceTrustDays}
                                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, deviceTrustDays: parseInt(e.target.value) || 0 }))}
                                    className="w-24 text-right text-sm font-bold px-3 py-2 rounded-lg"
                                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                    <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>API Keys</h3>
                            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Manage provider keys without changing code</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={openAddKeyModal}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                                style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                            >
                                Add API Key
                            </button>
                            <button
                                onClick={fetchApiKeys}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                    {apiKeysError && (
                        <div className="px-5 py-2 text-xs" style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' }}>
                            {apiKeysError}
                        </div>
                    )}
                    <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                        {apiKeysLoading ? (
                            <div className="px-5 py-8 text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
                                Loading API keys...
                            </div>
                        ) : apiKeys.length === 0 ? (
                            <div className="px-5 py-8 text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
                                No managed keys found.
                            </div>
                        ) : (
                            apiKeys.map(key => (
                                <div key={key.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 items-center">
                                    <div className="col-span-4">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{key.label || key.envKey}</p>
                                            <StatusPill status={key.isSet ? 'active' : 'paused'} />
                                        </div>
                                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{key.envKey}</p>
                                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{key.description || ''}</p>
                                    </div>
                                    <div className="col-span-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        <div className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Scopes</div>
                                        <div>{key.scopes?.join(', ') || 'None'}</div>
                                        <div className="mt-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                            Masked: <span style={{ color: 'var(--text-secondary)' }}>{key.masked || 'Not set'}</span>
                                        </div>
                                    </div>
                                    <div className="col-span-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                            Source: <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{key.source || 'unset'}</span>
                                        </div>
                                        <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                            Updated: <span style={{ color: 'var(--text-secondary)' }}>{key.updatedAt ? formatDate(key.updatedAt) : 'Never'}</span>
                                        </div>
                                        {key.updatedBy && (
                                            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                                By: <span style={{ color: 'var(--text-secondary)' }}>{key.updatedBy}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2">
                                        <button
                                            onClick={() => openApiKeyEditor(key)}
                                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                            style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                                        >
                                            Update
                                        </button>
                                        <button
                                            onClick={() => updateApiKey(key.id, '')}
                                            disabled={!key.isSet}
                                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                                        >
                                            Disable
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderBilling = () => {
        const mrr = 24890;
        const arr = mrr * 12;
        const churn = 3.1;
        const arpa = 42;
        const planRevenue = [
            { label: 'Free', amount: 1200, color: '#64748b' },
            { label: 'Pro', amount: 10890, color: '#6366f1' },
            { label: 'Team', amount: 12800, color: '#8b5cf6' },
        ];
        const total = planRevenue.reduce((sum, p) => sum + p.amount, 0);

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="fa-chart-line" label="MRR" value={`$${mrr.toLocaleString()}`} trend="+9%" trendUp gradient="linear-gradient(135deg, #10b981, #059669)" />
                    <StatCard icon="fa-dollar-sign" label="ARR" value={`$${arr.toLocaleString()}`} trend="+12%" trendUp gradient="linear-gradient(135deg, #6366f1, #4f46e5)" />
                    <StatCard icon="fa-arrow-down" label="Churn" value={`${churn}%`} trend="-0.4%" trendUp gradient="linear-gradient(135deg, #f59e0b, #d97706)" />
                    <StatCard icon="fa-user" label="ARPA" value={`$${arpa}`} trend="+3%" trendUp gradient="linear-gradient(135deg, #0ea5e9, #2563eb)" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                            <i className="fas fa-chart-pie mr-2 text-indigo-500"></i>Revenue by Plan
                        </h3>
                        <div className="space-y-4">
                            {planRevenue.map(plan => (
                                <div key={plan.label}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{plan.label}</span>
                                        <span className="text-xs font-bold" style={{ color: plan.color }}>${plan.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                        <div className="h-full rounded-full" style={{ width: `${Math.round((plan.amount / total) * 100)}%`, backgroundColor: plan.color }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <i className="fas fa-sliders text-amber-500"></i>Billing Controls
                        </h3>
                        <div className="space-y-4">
                            {[
                                { key: 'allowCoupons', label: 'Allow Coupons', desc: 'Enable coupon codes for promotions', icon: 'fa-ticket' },
                                { key: 'autoInvoices', label: 'Auto Invoicing', desc: 'Generate invoices automatically', icon: 'fa-file-invoice' },
                                { key: 'proration', label: 'Proration', desc: 'Prorate plan changes mid-cycle', icon: 'fa-scale-balanced' },
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                                            <i className={`fas ${item.icon} text-xs`}></i>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        enabled={(billingSettings as any)[item.key]}
                                        onToggle={() => {
                                            setBillingSettings(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }));
                                            triggerToast(`${item.label} ${(billingSettings as any)[item.key] ? 'disabled' : 'enabled'}`);
                                        }}
                                    />
                                </div>
                            ))}
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Trial Length (days)</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Default trial duration</p>
                                </div>
                                <input
                                    type="number"
                                    value={billingSettings.trialDays}
                                    onChange={(e) => setBillingSettings(prev => ({ ...prev, trialDays: parseInt(e.target.value) || 0 }))}
                                    className="w-24 text-right text-sm font-bold px-3 py-2 rounded-lg"
                                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                    <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Recent Invoices</h3>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                        {MOCK_INVOICES.map(inv => (
                            <div key={inv.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 items-center">
                                <div className="col-span-3">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{inv.id}</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatDate(inv.date)}</p>
                                </div>
                                <div className="col-span-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.customer}</div>
                                <div className="col-span-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>${inv.amount.toLocaleString()}</div>
                                <div className="col-span-2"><StatusPill status={inv.status} /></div>
                                <div className="col-span-1 text-right text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>{inv.plan}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderSystem = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_SERVICES.map(service => (
                    <div key={service.id} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{service.name}</p>
                            <StatusPill status={service.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span>Latency</span>
                            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{service.latencyMs}ms</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                            <span>Uptime</span>
                            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{service.uptime}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                            <span>Incidents</span>
                            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{service.incidents}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Background Jobs</h3>
                    <button
                        onClick={() => triggerToast('Queued job refresh')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                    >
                        Refresh
                    </button>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {MOCK_JOBS.map(job => (
                        <div key={job.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 items-center">
                            <div className="col-span-4">
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{job.name}</p>
                                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Last run {job.lastRun}</p>
                            </div>
                            <div className="col-span-3 text-xs" style={{ color: 'var(--text-secondary)' }}>Next: {job.nextRun}</div>
                            <div className="col-span-3"><StatusPill status={job.status} /></div>
                            <div className="col-span-2 flex justify-end gap-2">
                                <button
                                    onClick={() => triggerToast(`Triggered ${job.name}`)}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                    style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                                >
                                    Run
                                </button>
                                {job.status === 'failed' && (
                                    <button
                                        onClick={() => triggerToast(`Retrying ${job.name}`)}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                        style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-code-branch mr-2 text-indigo-500"></i>Release Info
                    </h3>
                    <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex items-center justify-between">
                            <span>Current Version</span>
                            <span className="font-semibold">v1.12.0</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Last Deploy</span>
                            <span className="font-semibold">2 hrs ago</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Region</span>
                            <span className="font-semibold">us-east-1</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Uptime</span>
                            <span className="font-semibold">41 days</span>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-bell mr-2 text-amber-500"></i>Incident Feed
                    </h3>
                    <div className="space-y-3">
                        {MOCK_ALERTS.map(alert => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <StatusPill status={alert.severity} />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{alert.title}</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{alert.detail}</p>
                                </div>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{alert.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderIntegrations = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {integrations.map(integration => (
                    <div key={integration.id} className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm"
                                    style={{ backgroundColor: integration.color }}
                                >
                                    <i className={`fas ${integration.icon}`}></i>
                                </div>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{integration.name}</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{integration.description}</p>
                                </div>
                            </div>
                            <StatusPill status={integration.status} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                                {integration.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <ToggleSwitch
                                enabled={integration.enabled}
                                onToggle={() => {
                                    setIntegrations(prev => prev.map(item => {
                                        if (item.id !== integration.id) return item;
                                        return { ...item, enabled: !item.enabled };
                                    }));
                                    triggerToast(`${integration.name} ${integration.enabled ? 'disabled' : 'enabled'}`);
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Webhooks</h3>
                    <button
                        onClick={() => triggerToast('Webhook created')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                    >
                        Add Webhook
                    </button>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {MOCK_WEBHOOKS.map(wh => (
                        <div key={wh.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 items-center">
                            <div className="col-span-4">
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{wh.name}</p>
                                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{wh.url}</p>
                            </div>
                            <div className="col-span-3"><StatusPill status={wh.status} /></div>
                            <div className="col-span-3 text-xs" style={{ color: 'var(--text-secondary)' }}>Last delivery {wh.lastDelivery}</div>
                            <div className="col-span-2 flex justify-end gap-2">
                                <button
                                    onClick={() => triggerToast(`Test sent to ${wh.name}`)}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                    style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                                >
                                    Test
                                </button>
                                <button
                                    onClick={() => triggerToast(`${wh.status === 'active' ? 'Paused' : 'Activated'} ${wh.name}`)}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                    style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                                >
                                    {wh.status === 'active' ? 'Pause' : 'Activate'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    <i className="fas fa-database mr-2 text-emerald-500"></i>Data Exports
                </h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => triggerToast('User export started')}
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                        Export Users
                    </button>
                    <button
                        onClick={() => triggerToast('Meeting export started')}
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                        Export Meetings
                    </button>
                    <button
                        onClick={() => triggerToast('Audit export started')}
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                        Export Audit Log
                    </button>
                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            {/* Feature Flags */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                <h3 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <i className="fas fa-toggle-on text-brand-500"></i>Feature Flags
                </h3>
                <div className="space-y-4">
                    {[
                        { key: 'aiTranscription', label: 'AI Transcription', desc: 'Enable real-time AI-powered transcription for meetings', icon: 'fa-microphone-lines' },
                        { key: 'autoTranslation', label: 'Auto Translation', desc: 'Allow automatic translation of meeting transcripts', icon: 'fa-language' },
                        { key: 'meetingRecording', label: 'Meeting Recording', desc: 'Enable meeting recording and audio capture', icon: 'fa-record-vinyl' },
                        { key: 'sentimentAnalysis', label: 'Sentiment Analysis', desc: 'Run sentiment analysis on meeting transcripts', icon: 'fa-face-smile' },
                        { key: 'analyticsCollection', label: 'Analytics Collection', desc: 'Collect usage analytics and telemetry data', icon: 'fa-chart-bar' },
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-xl transition-all" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                                    <i className={`fas ${item.icon} text-xs`}></i>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                                </div>
                            </div>
                            <ToggleSwitch
                                enabled={(settings as any)[item.key]}
                                onToggle={() => {
                                    setSettings(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }));
                                    triggerToast(`${item.label} ${(settings as any)[item.key] ? 'disabled' : 'enabled'}`);
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Notifications */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                <h3 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <i className="fas fa-bell text-amber-500"></i>Notifications
                </h3>
                <div className="space-y-4">
                    {[
                        { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send activity notifications via email', icon: 'fa-envelope' },
                        { key: 'pushNotifications', label: 'Push Notifications', desc: 'Send browser push notifications', icon: 'fa-mobile-screen' },
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-xl transition-all" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                                    <i className={`fas ${item.icon} text-xs`}></i>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                                </div>
                            </div>
                            <ToggleSwitch
                                enabled={(settings as any)[item.key]}
                                onToggle={() => {
                                    setSettings(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }));
                                    triggerToast(`${item.label} ${(settings as any)[item.key] ? 'disabled' : 'enabled'}`);
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* System Config */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                <h3 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <i className="fas fa-gear text-slate-500"></i>System Configuration
                </h3>
                <div className="space-y-4">
                    {[
                        { key: 'maxUploadSizeMB', label: 'Max Upload Size (MB)', icon: 'fa-upload' },
                        { key: 'rateLimitPerMin', label: 'Rate Limit (req/min)', icon: 'fa-gauge' },
                        { key: 'sessionTimeoutMins', label: 'Session Timeout (min)', icon: 'fa-hourglass-half' },
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-xl transition-all" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                                    <i className={`fas ${item.icon} text-xs`}></i>
                                </div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                            </div>
                            <input
                                type="number"
                                value={(settings as any)[item.key]}
                                onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                                className="w-24 text-right text-sm font-bold px-3 py-2 rounded-lg"
                                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <h3 className="text-sm font-bold mb-5 flex items-center gap-2 text-red-500">
                    <i className="fas fa-triangle-exclamation"></i>Danger Zone
                </h3>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            <i className="fas fa-power-off text-xs"></i>
                        </div>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Maintenance Mode</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Take the platform offline for scheduled maintenance</p>
                        </div>
                    </div>
                    <ToggleSwitch
                        enabled={settings.maintenanceMode}
                        onToggle={() => {
                            setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }));
                            triggerToast(`Maintenance mode ${settings.maintenanceMode ? 'disabled' : 'enabled'}`);
                        }}
                    />
                </div>
            </div>
        </div>
    );

    const renderActivity = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
                <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        Activity Log
                    </h3>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {MOCK_ACTIVITY.map(a => (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:scale-[1.005] transition-all">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${a.color}12`, color: a.color }}>
                                <i className={`fas ${a.icon} text-sm`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.detail}</p>
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>by <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{a.user}</span></p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                                    <i className="fas fa-clock mr-1 text-[9px]"></i>{a.time}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ─── Main Render ─────────────────────────────────────

    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 55%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)' }}
                    >
                        <i className="fas fa-shield-halved text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Control Room</h1>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            Central administration & management dashboard
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
                {TABS.map(tab => (
                    <TabButton
                        key={tab.key}
                        icon={tab.icon}
                        label={tab.label}
                        isActive={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        badge={tab.key === 'activity' ? MOCK_ACTIVITY.length : undefined}
                    />
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'meetings' && renderMeetings()}
            {activeTab === 'notes' && renderNotes()}
            {activeTab === 'security' && renderSecurity()}
            {activeTab === 'billing' && renderBilling()}
            {activeTab === 'system' && renderSystem()}
            {activeTab === 'integrations' && renderIntegrations()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'activity' && renderActivity()}

            {/* Add API Key Modal */}
            {showAddKeyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay-bg)' }}>
                    <div
                        className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-in"
                        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                                <i className="fas fa-plus"></i>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Add API Key</h3>
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Register a new provider key</p>
                            </div>
                        </div>
                        <div className="space-y-3 mb-5">
                            <input
                                type="text"
                                value={newKeyEnv}
                                onChange={(e) => setNewKeyEnv(e.target.value.toUpperCase())}
                                placeholder="ENV Key (e.g. NEW_PROVIDER_API_KEY)"
                                className="w-full text-sm font-semibold px-4 py-3 rounded-xl"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                            />
                            <input
                                type="text"
                                value={newKeyLabel}
                                onChange={(e) => setNewKeyLabel(e.target.value)}
                                placeholder="Label (e.g. New Provider API Key)"
                                className="w-full text-sm font-semibold px-4 py-3 rounded-xl"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                            />
                            <input
                                type="text"
                                value={newKeyDescription}
                                onChange={(e) => setNewKeyDescription(e.target.value)}
                                placeholder="Description"
                                className="w-full text-sm font-semibold px-4 py-3 rounded-xl"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                            />
                            <input
                                type="text"
                                value={newKeyScopes}
                                onChange={(e) => setNewKeyScopes(e.target.value)}
                                placeholder="Scopes (comma-separated)"
                                className="w-full text-sm font-semibold px-4 py-3 rounded-xl"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                            />
                            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                Example env key: <span style={{ color: 'var(--text-secondary)' }}>MY_PROVIDER_API_KEY</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={closeAddKeyModal}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createApiKeyDefinition}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}
                                disabled={createKeyLoading}
                            >
                                {createKeyLoading ? 'Saving...' : 'Add Key'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* API Key Update Modal */}
            {editingKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay-bg)' }}>
                    <div
                        className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-in"
                        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                                <i className="fas fa-key"></i>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Update API Key</h3>
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{editingKey.label || editingKey.envKey}</p>
                            </div>
                        </div>
                        <div className="space-y-3 mb-5">
                            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                Current: <span style={{ color: 'var(--text-secondary)' }}>{editingKey.masked || 'Not set'}</span>
                            </div>
                            <input
                                type="password"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                placeholder="Paste new key value"
                                className="w-full text-sm font-semibold px-4 py-3 rounded-xl"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                            />
                            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                Saving a value overrides the runtime key. Use Disable to clear the override.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={closeApiKeyEditor}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveApiKey}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}
                                disabled={!editingValue.trim()}
                            >
                                Save Key
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay-bg)' }}>
                    <div
                        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-in"
                        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                <i className="fas fa-triangle-exclamation"></i>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Confirm Delete</h3>
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                            Are you sure you want to delete this {confirmDelete.type}? It will be permanently removed from the system.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-2xl animate-slide-up flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 8px 30px rgba(99,102,241,0.35)' }}
                >
                    <i className="fas fa-check-circle text-emerald-300"></i>
                    {toastMessage}
                </div>
            )}
        </div>
    );
};

export default AdminPanel;

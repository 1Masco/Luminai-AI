import logger from '../logger/winston.config.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const MANAGED_API_KEYS = [
    {
        id: 'openai',
        envKey: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        description: 'Chat, summaries, analytics',
        scopes: ['chat', 'summary', 'analysis'],
    },
    {
        id: 'gemini',
        envKey: 'GEMINI_API_KEY',
        label: 'Gemini API Key',
        description: 'Summaries, translations',
        scopes: ['summary', 'translation'],
    },
    {
        id: 'deepgram',
        envKey: 'DEEPGRAM_API_KEY',
        label: 'Deepgram API Key',
        description: 'Audio transcription',
        scopes: ['transcription'],
    },
    {
        id: 'google',
        envKey: 'GOOGLE_API_KEY',
        label: 'Google API Key',
        description: 'Google Drive downloads',
        scopes: ['drive'],
    },
];

let overrides = {};
let overrideMeta = {};
let lastLoadedAt = 0;
const CACHE_TTL_MS = 30000;

const sanitizeValue = (value) => (typeof value === 'string' ? value.trim() : '');

export const getManagedKeyById = (id) => MANAGED_API_KEYS.find((key) => key.id === id);
export const getManagedKeys = () => MANAGED_API_KEYS;

export const maskSecret = (value) => {
    const raw = sanitizeValue(value);
    if (!raw) return '';
    if (raw.length <= 8) return `${raw.slice(0, 2)}****`;
    return `${raw.slice(0, 4)}****${raw.slice(-4)}`;
};

export const loadAdminSettings = async (force = false) => {
    if (!isSupabaseConfigured()) return;
    if (!force && Date.now() - lastLoadedAt < CACHE_TTL_MS) return;

    const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value, updated_at, updated_by');

    if (error) {
        logger.warn('Failed to load admin settings', { error: error.message });
        return;
    }

    const nextOverrides = {};
    const nextMeta = {};

    (data || []).forEach((row) => {
        nextOverrides[row.key] = row.value;
        nextMeta[row.key] = {
            updatedAt: row.updated_at,
            updatedBy: row.updated_by,
        };
    });

    overrides = nextOverrides;
    overrideMeta = nextMeta;
    lastLoadedAt = Date.now();
};

export const getRuntimeValue = (envKey) => overrides[envKey] ?? process.env[envKey] ?? '';

export const listManagedKeys = async () => {
    await loadAdminSettings();
    return MANAGED_API_KEYS.map((key) => {
        const value = getRuntimeValue(key.envKey);
        const meta = overrideMeta[key.envKey];
        const fromOverride = Boolean(overrides[key.envKey]);
        return {
            id: key.id,
            envKey: key.envKey,
            label: key.label,
            description: key.description,
            scopes: key.scopes,
            isSet: Boolean(value),
            masked: maskSecret(value),
            source: fromOverride ? 'admin' : (process.env[key.envKey] ? 'env' : 'unset'),
            updatedAt: meta?.updatedAt || null,
            updatedBy: meta?.updatedBy || null,
        };
    });
};

export const upsertAdminSetting = async (envKey, value, updatedBy) => {
    const normalized = sanitizeValue(value);

    if (!isSupabaseConfigured()) {
        if (normalized) {
            overrides[envKey] = normalized;
        } else {
            delete overrides[envKey];
        }
        overrideMeta[envKey] = {
            updatedAt: new Date().toISOString(),
            updatedBy: updatedBy || null,
        };
        return overrideMeta[envKey];
    }

    if (!normalized) {
        const { error } = await supabase
            .from('admin_settings')
            .delete()
            .eq('key', envKey);
        if (error) throw error;
        delete overrides[envKey];
        delete overrideMeta[envKey];
        return { updatedAt: null, updatedBy: updatedBy || null };
    }

    const { data, error } = await supabase
        .from('admin_settings')
        .upsert(
            {
                key: envKey,
                value: normalized,
                updated_at: new Date().toISOString(),
                updated_by: updatedBy || null,
            },
            { onConflict: 'key' }
        )
        .select()
        .single();

    if (error) throw error;

    overrides[envKey] = normalized;
    overrideMeta[envKey] = {
        updatedAt: data?.updated_at || new Date().toISOString(),
        updatedBy: data?.updated_by || updatedBy || null,
    };

    return overrideMeta[envKey];
};

export const recordAdminAction = async (action, payload, actorId) => {
    if (!isSupabaseConfigured()) return;
    if (!action) return;
    const { error } = await supabase
        .from('admin_actions')
        .insert({
            action,
            payload: payload || null,
            actor_id: actorId || null,
        });

    if (error) {
        logger.warn('Failed to record admin action', { action, error: error.message });
    }
};


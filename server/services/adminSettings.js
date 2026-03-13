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
let customDefinitions = [];
let lastLoadedAt = 0;
const CACHE_TTL_MS = 30000;
const CUSTOM_KEYS_TABLE = 'admin_key_definitions';

const sanitizeValue = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEnvKey = (value) => sanitizeValue(value).toUpperCase();
const isValidEnvKey = (value) => /^[A-Z][A-Z0-9_]*$/.test(value);

const mapCustomRow = (row) => ({
    id: row.id,
    envKey: row.id,
    label: row.label || row.id,
    description: row.description || '',
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    createdAt: row.created_at || null,
    createdBy: row.created_by || null,
});

const getCombinedDefinitions = () => {
    const combined = [...MANAGED_API_KEYS];
    customDefinitions.forEach((item) => {
        if (!combined.find((key) => key.id === item.id || key.envKey === item.envKey)) {
            combined.push(item);
        }
    });
    return combined;
};

export const getManagedKeyById = (id) => {
    const keyId = sanitizeValue(id);
    if (!keyId) return undefined;
    return getCombinedDefinitions().find((key) => key.id === keyId || key.envKey === keyId);
};

export const getManagedKeys = () => getCombinedDefinitions();

export const maskSecret = (value) => {
    const raw = sanitizeValue(value);
    if (!raw) return '';
    if (raw.length <= 8) return `${raw.slice(0, 2)}****`;
    return `${raw.slice(0, 4)}****${raw.slice(-4)}`;
};

export const loadAdminSettings = async (force = false) => {
    if (!isSupabaseConfigured()) return;
    if (!force && Date.now() - lastLoadedAt < CACHE_TTL_MS) return;

    const [settingsRes, customRes] = await Promise.all([
        supabase.from('admin_settings').select('key, value, updated_at, updated_by'),
        supabase.from(CUSTOM_KEYS_TABLE).select('id, label, description, scopes, created_at, created_by'),
    ]);

    if (settingsRes.error) {
        logger.warn('Failed to load admin settings', { error: settingsRes.error.message });
    } else {
        const nextOverrides = {};
        const nextMeta = {};

        (settingsRes.data || []).forEach((row) => {
            nextOverrides[row.key] = row.value;
            nextMeta[row.key] = {
                updatedAt: row.updated_at,
                updatedBy: row.updated_by,
            };
        });

        overrides = nextOverrides;
        overrideMeta = nextMeta;
    }

    if (customRes.error) {
        logger.warn('Failed to load admin key definitions', { error: customRes.error.message });
    } else {
        customDefinitions = (customRes.data || []).map(mapCustomRow);
    }

    lastLoadedAt = Date.now();
};

export const getRuntimeValue = (envKey) => overrides[envKey] ?? process.env[envKey] ?? '';

export const listManagedKeys = async () => {
    await loadAdminSettings();
    return getCombinedDefinitions().map((key) => {
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

export const createManagedKeyDefinition = async (payload, createdBy) => {
    const envKey = normalizeEnvKey(payload?.envKey || payload?.id || '');
    if (!envKey) {
        throw new Error('envKey is required');
    }
    if (!isValidEnvKey(envKey)) {
        throw new Error('envKey must be uppercase letters, numbers, and underscores only');
    }
    if (getManagedKeyById(envKey) || MANAGED_API_KEYS.some((key) => key.envKey === envKey)) {
        throw new Error('A key with this envKey already exists');
    }

    const definition = {
        id: envKey,
        label: sanitizeValue(payload?.label) || envKey,
        description: sanitizeValue(payload?.description) || '',
        scopes: Array.isArray(payload?.scopes)
            ? payload.scopes.map((scope) => sanitizeValue(scope)).filter(Boolean)
            : [],
        created_at: new Date().toISOString(),
        created_by: createdBy || null,
    };

    if (!isSupabaseConfigured()) {
        customDefinitions = [...customDefinitions, mapCustomRow(definition)];
        return mapCustomRow(definition);
    }

    const { data, error } = await supabase
        .from(CUSTOM_KEYS_TABLE)
        .insert(definition)
        .select('id, label, description, scopes, created_at, created_by')
        .single();

    if (error) throw error;

    const created = mapCustomRow(data);
    customDefinitions = [...customDefinitions, created];
    return created;
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

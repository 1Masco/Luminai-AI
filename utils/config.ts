// Centralized frontend configuration
// All environment variables are validated here

const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const isBrowser = typeof window !== 'undefined';
const isLocalHost =
  isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const defaultApiUrl = isLocalHost
  ? 'http://localhost:3001'
  : (isBrowser ? window.location.origin : 'http://localhost:3001');

export const config = {
  // API Configuration
  apiUrl: envApiUrl || defaultApiUrl,

  // Supabase
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },

  // Google APIs
  google: {
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  },

  // Dropbox
  dropbox: {
    appKey: import.meta.env.VITE_DROPBOX_APP_KEY,
  },

  // Feature flags
  features: {
    enableMockAuth: import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true',
    disableFeatureGating: import.meta.env.VITE_DISABLE_FEATURE_GATING === 'true',
  },
};

/**
 * Check if Supabase is properly configured
 * @returns {boolean} True if all required Supabase config is present
 */
export function isSupabaseConfigured() {
  return (
    config.supabase.url &&
    config.supabase.anonKey &&
    !config.supabase.url.includes('YOUR_SUPABASE_URL') &&
    !config.supabase.anonKey.includes('YOUR_ANON_KEY')
  );
}

/**
 * Validate that all required configuration is present
 * @throws Error if critical configuration is missing
 */
export function validateConfig() {
  const errors = [];

  if (!config.supabase.url) {
    errors.push('Supabase URL not configured (VITE_SUPABASE_URL)');
  }

  if (!config.supabase.anonKey) {
    errors.push('Supabase anon key not configured (VITE_SUPABASE_ANON_KEY)');
  }

  if (errors.length > 0) {
    console.warn('Configuration warnings:', errors);
  }

  return errors.length === 0;
}

export default config;

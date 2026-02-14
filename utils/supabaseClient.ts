import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return Boolean(supabaseUrl && supabaseAnonKey &&
        supabaseUrl !== 'your_supabase_project_url' &&
        supabaseAnonKey !== 'your_supabase_anon_key');
};

// Lazy client creation avoids startup crash when env vars are missing.
export const getSupabaseClient = () => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    if (!supabaseClient) {
        supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
    }

    return supabaseClient;
};

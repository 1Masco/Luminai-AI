import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return Boolean(supabaseUrl && supabaseAnonKey &&
        supabaseUrl !== 'your_supabase_project_url' &&
        supabaseAnonKey !== 'your_supabase_anon_key');
};

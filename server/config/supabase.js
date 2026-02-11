import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables. Please check your .env file.');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

// Create Supabase client with service role key for server-side operations
export const supabase = createClient(
    supabaseUrl || '',
    supabaseServiceKey || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return Boolean(
        supabaseUrl &&
        supabaseServiceKey &&
        supabaseUrl !== 'your_supabase_project_url' &&
        supabaseServiceKey !== 'your_supabase_service_role_key'
    );
};

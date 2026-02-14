/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_GOOGLE_API_KEY?: string;
    readonly VITE_GOOGLE_CLIENT_ID?: string;
    readonly VITE_DROPBOX_APP_KEY?: string;
    readonly VITE_ENABLE_MOCK_AUTH?: string;
    readonly VITE_DISABLE_FEATURE_GATING?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

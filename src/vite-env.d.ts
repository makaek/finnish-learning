/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Absent in local/dev → backend falls back to localStorage. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (publishable) key. Public by design; row access is enforced by RLS. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

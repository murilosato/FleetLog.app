import { createClient } from '@supabase/supabase-js';

// Using type assertion to access Vite environment variables and fix TypeScript 'ImportMeta' error
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
// Using type assertion to access Vite environment variables and fix TypeScript 'ImportMeta' error
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
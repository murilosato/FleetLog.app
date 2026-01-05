import { createClient } from '@supabase/supabase-js';

// Fix: Cast import.meta to any to allow accessing the Vite 'env' property which is missing from standard ImportMeta types
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
// Chave pública do projeto
// Fix: Cast import.meta to any to allow accessing the Vite 'env' property which is missing from standard ImportMeta types
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
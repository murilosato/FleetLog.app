import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'VITE_SUPABASE_URL';
// Chave pública do projeto
const supabaseKey = 'VITE_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);
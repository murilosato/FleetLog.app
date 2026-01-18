
import { createClient } from '@supabase/supabase-js';

// No Vite, precisamos de referências literais para que o compilador substitua os valores
// Tentamos primeiro o padrão Vite (import.meta.env) e depois o mapeamento do processo
const supabaseUrl = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  '';

const supabaseKey = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO CRÍTICO DE CONFIGURAÇÃO: As credenciais do Supabase (URL ou KEY) não foram detectadas no ambiente. Verifique o arquivo .env ou as Secrets do projeto.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

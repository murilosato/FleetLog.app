
import { createClient } from '@supabase/supabase-js';

// Função auxiliar para obter variáveis de ambiente de forma segura
const getEnvVar = (name: string): string => {
  // Tenta obter do import.meta.env (Padrão Vite)
  if (typeof (import.meta as any).env !== 'undefined' && (import.meta as any).env[name]) {
    return (import.meta as any).env[name];
  }
  // Tenta obter do process.env (Fallback para outros ambientes)
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials not found. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);


import { createClient } from '@supabase/supabase-js';

// Função auxiliar para buscar variáveis de ambiente em diferentes padrões (Vite, Process, etc)
const getEnvVar = (name: string): string => {
  const env = (import.meta as any).env || {};
  const proc = (typeof process !== 'undefined' ? process.env : {}) as any;
  
  // Lista de possíveis nomes para a mesma variável
  const fallbacks: Record<string, string[]> = {
    'VITE_SUPABASE_URL': ['VITE_SUPABASE_URL', 'SUPABASE_URL', 'REACT_APP_SUPABASE_URL'],
    'VITE_SUPABASE_ANON_KEY': ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY']
  };

  const keysToTry = fallbacks[name] || [name];
  
  for (const key of keysToTry) {
    if (env[key]) return env[key];
    if (proc[key]) return proc[key];
  }
  
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO DE CONEXÃO: Variáveis do Supabase não encontradas. Verifique as configurações de ambiente.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

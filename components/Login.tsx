
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${credential},matricula.eq.${credential}`)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Usuário ou Matrícula não encontrados.');
      } else {
        onLogin(data as User);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar ao servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAdmin = async () => {
    setSeedStatus('loading');
    try {
      // Verifica se já existe
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', 'admin')
        .maybeSingle();

      if (existing) {
        setSeedStatus('success');
        alert('Usuário admin já existe no banco.');
        return;
      }

      // Insere o admin inicial
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'Admin Sistema',
            username: 'admin',
            role: 'ADMIN',
            matricula: '001'
          }
        ]);

      if (insertError) throw insertError;
      
      setSeedStatus('success');
      alert('Usuário "admin" (matrícula 001) criado com sucesso!');
    } catch (err) {
      console.error(err);
      setSeedStatus('error');
      alert('Erro ao criar usuário admin. Verifique as permissões da tabela users.');
    }
  };

  return (
    <div className="min-h-screen bg-emerald-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mb-4 text-white font-bold text-4xl italic shadow-inner">S</div>
          <h1 className="text-2xl font-bold text-slate-800">SOLURB</h1>
          <p className="text-slate-500">Acesso ao Sistema Operacional</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Usuário ou Matrícula</label>
            <input 
              type="text" 
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Ex: admin ou 001"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-xs font-medium animate-pulse">
              {error}
            </div>
          )}
          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Verificando...</span>
              </div>
            ) : 'Acessar Painel'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center">
          <button 
            onClick={handleSeedAdmin}
            disabled={seedStatus === 'loading'}
            className="text-[10px] text-slate-400 hover:text-emerald-600 uppercase tracking-widest font-bold transition-colors"
          >
            {seedStatus === 'loading' ? 'CONFIGURANDO...' : '⚙️ Configuração Inicial (Criar Admin)'}
          </button>
        </div>
      </div>
      
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-black/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default Login;

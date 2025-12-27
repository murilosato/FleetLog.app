
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCredential = credential.trim();
    
    if (!cleanCredential) {
      setError('Por favor, informe o usuário ou matrícula.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${cleanCredential},matricula.eq.${cleanCredential}`)
        .maybeSingle();

      if (dbError) throw new Error(dbError.message);

      if (!data) {
        setError('Acesso negado. Usuário ou Matrícula não encontrados.');
      } else {
        onLogin(data as User);
      }
    } catch (err: any) {
      console.error('Erro crítico no login:', err);
      setError(`Erro de conexão: ${err.message || 'Verifique sua internet.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4 text-white font-bold text-5xl shadow-lg transform -rotate-3">S</div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">SOLURB</h1>
          <p className="text-slate-400 font-medium">Checklist Digital de Coleta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Matrícula ou Usuário</label>
            <input 
              type="text" 
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:ring-0 outline-none transition-all text-lg font-medium"
              placeholder="Ex: 001 ou admin"
              autoFocus
              required
            />
            <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Use a matrícula numérica ou seu nome de usuário.</p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-semibold border border-red-100 animate-pulse">
              {error}
            </div>
          )}

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-emerald-200 disabled:opacity-50 transition-all active:scale-95 text-lg"
          >
            {loading ? 'Validando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">Versão Digital 2.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

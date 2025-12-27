
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
        setError('Acesso negado. Credenciais não encontradas.');
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
    <div className="min-h-screen bg-[#0A2540] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-md w-full relative overflow-hidden">
        {/* Adorno Decorativo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1E90FF]/10 rounded-full -mr-16 -mt-16"></div>
        
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="relative w-24 h-24 bg-[#1E90FF] rounded-3xl flex items-center justify-center mb-6 text-white font-black text-5xl shadow-xl transform -rotate-6">
             <div className="absolute inset-2 border-2 border-white/20 rounded-xl"></div>
             eS
             <div className="absolute -bottom-2 -right-2 bg-[#58CC02] w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
             </div>
          </div>
          <h1 className="text-4xl font-black text-[#0A2540] tracking-tight">ecoSCheck</h1>
          <p className="text-slate-400 font-bold text-center mt-2 leading-tight">CheckList Digital para sua Frota</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Acesso do Operador</label>
            <input 
              type="text" 
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-[#1E90FF] focus:ring-0 outline-none transition-all text-lg font-bold text-slate-800 shadow-inner"
              placeholder="Matrícula ou Usuário"
              autoFocus
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-xs font-black border border-red-100 flex items-center gap-3 animate-in shake duration-300">
               <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
               {error}
            </div>
          )}

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-[#1E90FF] hover:bg-[#0A2540] text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-blue-200 disabled:opacity-50 transition-all active:scale-95 text-xl uppercase tracking-widest"
          >
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">Versão 3.1.2</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

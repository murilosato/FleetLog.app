
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authError) throw new Error("E-mail ou senha incorretos.");

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) throw new Error("Perfil não configurado no sistema.");
      if (!profile.active) throw new Error("Sua conta está desativada.");

      onLogin(profile as User);
    } catch (err: any) {
      setError(err.message);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-rajdhani relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20"></div>
      
      <div className="max-w-md w-full z-10 animate-in fade-in duration-700">
        <div className="bg-white p-10 sm:p-12 rounded-[3rem] shadow-2xl border border-slate-100">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black tracking-tighter mb-1 text-[#0A2540]">
              <span className="text-[#00548b]">FLEET</span>LOG
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gestão Operacional de Frota</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">E-mail Corporativo</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] text-slate-900 font-bold outline-none focus:border-[#00548b] transition-all"
                placeholder="nome@empresa.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Senha</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] text-slate-900 font-bold outline-none focus:border-[#00548b] transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-[10px] font-bold uppercase text-center border border-red-100">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full py-5 bg-[#0A2540] text-white font-black rounded-[1.8rem] shadow-xl hover:bg-[#00548b] active:scale-95 transition-all text-xs tracking-widest uppercase disabled:opacity-50"
            >
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Acesso restrito a colaboradores autorizados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Autenticação oficial Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw new Error("Credenciais inválidas ou usuário não cadastrado.");

      // 2. Busca o perfil estendido (tabela public.users) que contém a role e company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        await supabase.auth.signOut();
        throw new Error("Perfil operacional não configurado. Contate o administrador.");
      }

      if (!userData.active) {
        await supabase.auth.signOut();
        throw new Error("Sua conta está inativa para esta empresa.");
      }

      onLogin(userData as User);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-rajdhani">
      
      {/* Background Dinâmico */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://ybclluccxjblhougqdep.supabase.co/storage/v1/object/public/FLEETLOG/VEICULOS.png" 
          alt="Frota FleetLog" 
          className="w-full h-full object-cover opacity-[0.2] contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/90 via-transparent to-[#020617]"></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        <div className="bg-[#0f172a]/95 backdrop-blur-3xl rounded-[3rem] p-10 sm:p-12 shadow-[0_0_80px_rgba(0,242,255,0.15)] border border-white/5">
          
          <div className="flex flex-col items-center mb-10 text-center">
             <div className="mb-4 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-[#00f2ff] to-[#00548b] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.3)]">
                   <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                </div>
             </div>
             <h1 className="text-4xl sm:text-5xl font-black tracking-tighter flex items-baseline">
                <span className="text-[#00f2ff]">FLEET</span>
                <span className="text-slate-400 ml-0.5">LOG</span>
             </h1>
             <p className="text-[#00f2ff] font-bold text-[10px] uppercase tracking-[0.4em] mt-2">Enterprise Resource Planning</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">E-mail Corporativo</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] focus:border-[#00f2ff] focus:bg-white/10 outline-none transition-all text-white font-bold placeholder:text-slate-700 text-sm"
                placeholder="exemplo@suaempresa.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Senha de Acesso</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] focus:border-[#00f2ff] focus:bg-white/10 outline-none transition-all text-white font-bold placeholder:text-slate-700 text-sm"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-[#00f2ff]"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-500/20">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" /></svg>
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-[#00f2ff] text-[#020617] font-black rounded-[1.5rem] shadow-[0_10px_30px_rgba(0,242,255,0.3)] hover:brightness-110 active:scale-[0.98] transition-all text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3"
            >
              {loading ? "AUTENTICANDO..." : "ACESSAR OPERAÇÃO"}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-6">
            <p className="text-slate-500 font-bold text-[10px] leading-relaxed text-center italic opacity-60">
              Ambiente Multi-Empresa FleetLog v9.0.0
            </p>
            <div className="flex items-center gap-4">
              <span className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.4em]">Proteção Bancária AES-256</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      alert("Para baixar o FleetLog, use a opção 'Adicionar à tela de início' no menu do seu navegador.");
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    
    if (!cleanUser || !cleanPass) {
      setError('Informe seu nome de usuário e senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Nota: Para um sistema comercial, recomenda-se usar o Supabase Auth (auth.signInWithPassword)
      // Aqui simulamos a validação via tabela 'public.users' conforme solicitado
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('username', cleanUser)
        .eq('password_hash', cleanPass) // Em produção, usar comparação de Hash Bcrypt
        .eq('active', true)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Usuário ou senha incorretos, ou conta desativada.');
      } else {
        onLogin(data as User);
      }
    } catch (err: any) {
      setError(`Falha na autenticação: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-rajdhani">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1E90FF] via-[#58CC02] to-[#0A2540]"></div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-green-100/50 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white rounded-[3rem] p-8 sm:p-12 shadow-[0_32px_64px_rgba(0,0,0,0.06)] border border-slate-100">
          
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 bg-[#0A2540] rounded-3xl flex items-center justify-center shadow-xl mb-6">
               <svg className="w-12 h-12 text-[#1E90FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h1 className="text-3xl font-black text-[#0A2540] tracking-tighter">
              FLEET<span className="text-[#1E90FF]">LOG</span>
            </h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">Enterprise Resource Planning</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Login (Username)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-[#1E90FF] focus:bg-white outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                  placeholder="ex: joao.silva"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
                <button type="button" className="text-[9px] font-black text-[#1E90FF] uppercase tracking-widest hover:underline">Esqueci a senha</button>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-[#1E90FF] focus:bg-white outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#1E90FF] transition-colors"
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
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-100 animate-in shake duration-300">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-[#0A2540] text-white font-black rounded-2xl shadow-xl hover:bg-[#1E90FF] active:scale-[0.98] transition-all text-xs uppercase tracking-[0.25em] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <>
                  <span>Entrar no FleetLog</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-6">
             <button 
              onClick={handleInstall}
              className="flex items-center gap-3 text-slate-400 hover:text-[#1E90FF] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Baixar App Corporativo</span>
            </button>
            <div className="flex items-center gap-4">
              <span className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.4em]">v6.0.0 Business</span>
              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
              <span className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.4em]">SSL Secure</span>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest px-8 leading-relaxed">
          Sua conta é pessoal e intransferível.<br/>O uso indevido resultará em medidas administrativas.
        </p>
      </div>
    </div>
  );
};

export default Login;

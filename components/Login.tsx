
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [credential, setCredential] = useState('');
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
    const cleanCredential = credential.trim();
    
    if (!cleanCredential) {
      setError('Acesso negado: informe credenciais.');
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
        setError('Usuário não identificado na central.');
      } else {
        onLogin(data as User);
      }
    } catch (err: any) {
      setError(`Erro de rede: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background futurista */}
      <div className="absolute inset-0 grid-bg opacity-40"></div>
      <div className="animate-scan"></div>
      
      {/* Luzes de fundo decorativas */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-lime-500/5 rounded-full blur-[120px]"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          
          {/* Logo e Branding */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-lime-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative w-20 h-20 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-700 text-cyan-400">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" className="animate-pulse" />
                </svg>
              </div>
            </div>
            <h1 className="mt-6 text-4xl font-tech font-black tracking-widest text-white">
              FLEET<span className="text-cyan-400">LOG</span>
            </h1>
            <div className="h-0.5 w-12 bg-cyan-500/50 mt-1 rounded-full"></div>
            <p className="mt-4 text-slate-400 font-medium tracking-[0.2em] text-[10px] uppercase text-center">
              Inteligência Operacional de Frota
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-bold text-cyan-500/70 uppercase tracking-[0.3em]">Autenticação</label>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-ping"></div>
                  <div className="w-1 h-1 bg-cyan-500/40 rounded-full"></div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
                <input 
                  type="text" 
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-slate-950/50 border border-slate-700 rounded-2xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all text-white font-semibold tracking-wider placeholder:text-slate-700"
                  placeholder="ID DO OPERADOR"
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 animate-in fade-in zoom-in-95">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="relative bg-cyan-500 text-slate-950 font-tech font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(6,182,212,0.3)] group-active:scale-95 transition-all text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                {loading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <>
                    <span>INICIAR SESSÃO</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-12 flex flex-col items-center gap-6">
            <button 
              onClick={handleInstall}
              className="text-[10px] font-black text-cyan-400 hover:text-white uppercase tracking-[0.2em] transition-all flex items-center gap-3 bg-cyan-500/5 px-6 py-4 rounded-2xl border border-cyan-500/20 hover:bg-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              INSTALAR FLEETLOG APP
            </button>
            <div className="flex items-center gap-4 w-full">
              <div className="h-px flex-1 bg-slate-800"></div>
              <span className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.4em]">v4.0.0 CORE</span>
              <div className="h-px flex-1 bg-slate-800"></div>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-600 text-[10px] font-medium uppercase tracking-[0.1em] px-4">
          "Aqui começam os dados da sua frota. Controle operacional inteligente em tempo real."
        </p>
      </div>
    </div>
  );
};

export default Login;

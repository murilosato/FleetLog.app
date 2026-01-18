
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
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    
    if (!cleanEmail || !cleanPass) {
      setError('Informe seu e-mail e senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Tentar Autenticação no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          throw new Error('E-mail ou senha incorretos.');
        }
        throw authError;
      }

      if (authData.user) {
        const authUserId = authData.user.id;

        // 2. Tentar buscar perfil pelo novo ID (UUID)
        let { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .maybeSingle();

        // 3. Lógica de Sincronização Obrigatória (Link por e-mail)
        if (!profile) {
          console.log("Sincronizando ID do perfil...");
          
          // Busca o perfil que tem o e-mail mas ainda está com o ID antigo (texto)
          const { data: legacyProfile } = await supabase
            .from('users')
            .select('*')
            .eq('username', cleanEmail)
            .maybeSingle();

          if (legacyProfile) {
            // "Carimba" o perfil com o novo UUID do Auth
            const { data: updatedProfile, error: updateError } = await supabase
              .from('users')
              .update({ id: authUserId })
              .eq('username', cleanEmail)
              .select()
              .single();

            if (updateError) {
              console.error("Erro na atualização do ID:", updateError);
              throw new Error("Erro de banco de dados. Por favor, execute o script SQL de reparo.");
            }
            profile = updatedProfile;
          }
        }

        // 4. Verificações Finais
        if (!profile) {
          throw new Error('Perfil não encontrado no sistema. Verifique com seu gestor.');
        }

        if (profile.active === false) {
          await supabase.auth.signOut();
          throw new Error('Esta conta foi desativada.');
        }

        onLogin(profile as User);
      }
    } catch (err: any) {
      setError(err.message);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-rajdhani">
      {/* Imagem de Fundo (Frota) */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://ybclluccxjblhougqdep.supabase.co/storage/v1/object/public/FLEETLOG/VEICULOS.png" 
          alt="Frota FleetLog" 
          className="w-full h-full object-cover opacity-[0.15] contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/70 via-transparent to-[#020617]"></div>
      </div>

      <div className="absolute inset-0 grid-bg opacity-[0.05] pointer-events-none"></div>
      
      <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        <div className="bg-[#0f172a]/95 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-12 shadow-[0_0_100px_rgba(0,0,0,0.7)] border border-slate-800/60">
          
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="mb-2">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter flex items-baseline">
                <span className="text-[#00548b]">FLEET</span>
                <span className="text-[#425466]">LOG</span>
              </h1>
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-1">Aqui será a Gestão da sua Frota</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-slate-900/60 border-2 border-slate-800/80 rounded-2xl focus:border-[#00548b] focus:bg-slate-900 outline-none transition-all text-white font-bold placeholder:text-slate-800 text-xs tracking-wider"
                placeholder="SEU E-MAIL CADASTRADO"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Segurança</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-900/60 border-2 border-slate-800/80 rounded-2xl focus:border-[#00548b] focus:bg-slate-900 outline-none transition-all text-white font-bold placeholder:text-slate-800 text-xs tracking-wider"
                  placeholder="SUA SENHA"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-[#00548b]"
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
              <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-[10px] font-black uppercase text-center border border-red-500/20">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-[#00548b] text-white font-black rounded-2xl shadow-[0_15px_40px_rgba(0,84,139,0.4)] hover:bg-[#00436e] active:scale-[0.98] transition-all text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? "AUTENTICANDO..." : "INICIALIZAR SISTEMA"}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col items-center gap-6 text-center">
            <p className="text-slate-400 font-bold text-[10px] sm:text-[11px] italic opacity-90 border-l-2 border-[#00548b] pl-3">
              "Aqui começam os dados da sua frota, controle operacional inteligente em tempo real."
            </p>

            <button 
              onClick={handleInstall}
              className="flex items-center gap-3 text-slate-500 hover:text-[#00548b] transition-colors"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Baixar App Corporativo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

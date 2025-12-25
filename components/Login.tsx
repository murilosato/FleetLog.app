
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
    const cleanCredential = credential.trim();
    
    if (!cleanCredential) {
      setError('Por favor, informe o usuário ou matrícula.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Tentando login com:', cleanCredential);
      
      // Busca por username ou matrícula
      // Nota: Usamos aspas simples no filtro .or para evitar erros de sintaxe com strings
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${cleanCredential},matricula.eq.${cleanCredential}`)
        .maybeSingle();

      if (dbError) {
        console.error('Erro de banco de dados:', dbError);
        throw new Error(dbError.message);
      }

      if (!data) {
        console.warn('Usuário não encontrado para a credencial:', cleanCredential);
        setError('Acesso negado. Usuário ou Matrícula não encontrados.');
      } else {
        console.log('Login bem-sucedido:', data.name);
        onLogin(data as User);
      }
    } catch (err: any) {
      console.error('Erro crítico no login:', err);
      setError(`Erro de conexão: ${err.message || 'Verifique sua internet ou banco de dados.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedUsers = async () => {
    if (!confirm('Deseja criar/restaurar os usuários padrão (admin, manutencao, operacao)?')) return;
    
    setSeedStatus('loading');
    try {
      const initialUsers = [
        { id: '10000000-0000-0000-0000-000000000001', name: 'Administrador', username: 'admin', role: 'ADMIN', matricula: '001' },
        { id: '10000000-0000-0000-0000-000000000002', name: 'Manutenção', username: 'manutencao', role: 'MANUTENCAO', matricula: '002' },
        { id: '10000000-0000-0000-0000-000000000003', name: 'Operação', username: 'operacao', role: 'OPERACAO', matricula: '003' }
      ];

      for (const user of initialUsers) {
        const { data: existing } = await supabase.from('users').select('id').eq('username', user.username).maybeSingle();
        if (!existing) {
          const { error } = await supabase.from('users').insert([user]);
          if (error) console.error(`Erro ao inserir ${user.username}:`, error);
        }
      }
      
      setSeedStatus('success');
      alert('Usuários padrão verificados/criados com sucesso!');
    } catch (err: any) {
      console.error('Erro no seed:', err);
      setSeedStatus('error');
      alert('Erro ao configurar usuários: ' + err.message);
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
            <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Use a matrícula numérica (operadores) ou o nome de usuário.</p>
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
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Validando...
              </span>
            ) : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-50 flex flex-col items-center">
          <button 
            onClick={handleSeedUsers}
            disabled={seedStatus === 'loading'}
            className="text-[10px] text-slate-300 hover:text-emerald-600 font-bold uppercase tracking-widest transition-colors py-2"
          >
            {seedStatus === 'loading' ? 'CONFIGURANDO...' : '🛠️ Sincronizar Usuários Padrão'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

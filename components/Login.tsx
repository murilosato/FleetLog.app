
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
      // Busca por username ou matrícula
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${credential},matricula.eq.${credential}`)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Acesso negado. Usuário ou Matrícula não encontrados.');
      } else {
        onLogin(data as User);
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão. Verifique o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedUsers = async () => {
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
          await supabase.from('users').insert([user]);
        }
      }
      
      setSeedStatus('success');
      alert('Usuários (admin, manutencao, operacao) configurados!');
    } catch (err) {
      console.error(err);
      setSeedStatus('error');
      alert('Erro ao configurar usuários iniciais.');
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
              placeholder="Digite aqui..."
              required
            />
            <p className="text-[10px] text-slate-400 mt-2">Dica: Use 001, 002 ou 003 para os usuários iniciais.</p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-semibold border border-red-100 animate-shake">
              {error}
            </div>
          )}

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-emerald-200 disabled:opacity-50 transition-all active:scale-95 text-lg"
          >
            {loading ? 'Carregando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-50 flex flex-col items-center">
          <button 
            onClick={handleSeedUsers}
            disabled={seedStatus === 'loading'}
            className="text-[10px] text-slate-300 hover:text-emerald-600 font-bold uppercase tracking-widest transition-colors"
          >
            {seedStatus === 'loading' ? 'PROCESSANDO...' : '🛠️ Inicializar Usuários Padrão'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;


import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && matricula.trim()) {
      onLogin({
        id: matricula,
        name: name,
        role: 'driver'
      });
    }
  };

  return (
    <div className="min-h-screen bg-emerald-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
             <span className="text-white font-bold text-4xl italic">S</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SOLURB</h1>
          <p className="text-slate-500">Checklist Digital de Veículos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Digite seu nome"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Matrícula</label>
            <input 
              type="text" 
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="ID do Funcionário"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Entrar no Sistema
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Uso exclusivo para colaboradores autorizados SOLURB.
        </p>
      </div>
    </div>
  );
};

export default Login;

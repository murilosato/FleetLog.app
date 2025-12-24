
import React, { useState, useEffect } from 'react';
import { User, ChecklistSubmission } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';
import HistoryView from './components/HistoryView';
import { GoogleGenAI } from '@google/genai';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'history'>('dashboard');
  const [submissions, setSubmissions] = useState<ChecklistSubmission[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Load submissions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('solurb_submissions');
    if (saved) {
      setSubmissions(JSON.parse(saved));
    }
  }, []);

  // Save submissions to localStorage
  useEffect(() => {
    localStorage.setItem('solurb_submissions', JSON.stringify(submissions));
  }, [submissions]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
  };

  const handleSubmitChecklist = (submission: ChecklistSubmission) => {
    setSubmissions([submission, ...submissions]);
    setView('dashboard');
  };

  const generateAiReport = async () => {
    if (submissions.length === 0) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Analise os últimos ${submissions.length} relatórios de inspeção de veículos de coleta de resíduos.
      Dados: ${JSON.stringify(submissions.slice(0, 5).map(s => ({
        prefix: s.prefix,
        date: s.date,
        itemsDefective: s.sections.flatMap(sec => sec.items).filter(i => i.status === 'DEFEITUOSO').map(i => i.label)
      })))}
      
      Forneça um breve resumo executivo em Português sobre o estado geral da frota e destaque pontos críticos que precisam de manutenção urgente.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiSummary(response.text || "Não foi possível gerar o resumo no momento.");
    } catch (error) {
      console.error("AI Error:", error);
      setAiSummary("Erro ao conectar com a inteligência artificial para gerar relatório.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-emerald-700 font-bold text-xl italic">S</span>
            </div>
            <h1 className="font-bold tracking-tight text-lg">SOLURB DIGITAL</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:inline opacity-90">Olá, <span className="font-semibold">{user.name}</span></span>
            <button 
              onClick={handleLogout}
              className="text-sm bg-emerald-800 hover:bg-emerald-900 px-3 py-1 rounded transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-24">
        {view === 'dashboard' && (
          <Dashboard 
            submissions={submissions} 
            onNewChecklist={() => setView('form')} 
            onViewHistory={() => setView('history')}
            aiSummary={aiSummary}
            isSummarizing={isSummarizing}
            generateAiReport={generateAiReport}
          />
        )}
        {view === 'form' && (
          <ChecklistForm 
            user={user} 
            onSubmit={handleSubmitChecklist} 
            onCancel={() => setView('dashboard')} 
          />
        )}
        {view === 'history' && (
          <HistoryView 
            submissions={submissions} 
            onBack={() => setView('dashboard')} 
          />
        )}
      </main>

      {/* Persistent Bottom Nav (Mobile Only) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 shadow-2xl z-40">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center p-2 rounded-lg ${view === 'dashboard' ? 'text-emerald-700' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <span className="text-xs">Início</span>
        </button>
        <button 
          onClick={() => setView('form')}
          className={`flex flex-col items-center p-2 rounded-lg ${view === 'form' ? 'text-emerald-700' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          <span className="text-xs">Novo</span>
        </button>
        <button 
          onClick={() => setView('history')}
          className={`flex flex-col items-center p-2 rounded-lg ${view === 'history' ? 'text-emerald-700' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span className="text-xs">Histórico</span>
        </button>
      </nav>
    </div>
  );
};

export default App;

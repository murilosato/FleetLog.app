
import React, { useState, useEffect } from 'react';
import { User, ChecklistEntry, Vehicle, DBChecklistItem } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';
import HistoryView from './components/HistoryView';
import AdminPanel from './components/AdminPanel';
import { GoogleGenAI } from '@google/genai';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'history' | 'admin'>('dashboard');
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklistItems, setChecklistItems] = useState<DBChecklistItem[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const initAppData = async () => {
    setIsLoading(true);
    try {
      const [vRes, iRes] = await Promise.all([
        supabase.from('vehicles').select('*').order('prefix', { ascending: true }),
        supabase.from('checklist_items').select('*').order('category', { ascending: true })
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (iRes.data) setChecklistItems(iRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAppData();
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setEntries(data as ChecklistEntry[]);
    } catch (err) {
      console.error('Erro ao buscar entradas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
  };

  const handleSubmitEntry = async (entry: ChecklistEntry) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('entries').insert([entry]);
      if (error) throw error;
      
      await supabase.from('vehicles').update({
        current_km: entry.km,
        current_horimetro: entry.horimetro
      }).eq('id', entry.vehicle_id);

      await fetchEntries();
      await initAppData();
      setView('dashboard');
    } catch (err) {
      console.error('Erro ao salvar entrada:', err);
      alert('Erro ao salvar vistoria.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAiReport = async () => {
    if (entries.length === 0) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise os últimos relatórios de inspeção da frota SOLURB.
      Dados: ${JSON.stringify(entries.slice(0, 10).map(e => ({
        prefix: e.prefix,
        hasIssues: e.has_issues,
        obs: e.general_observations
      })))}
      Forneça um resumo executivo sobre a saúde da frota e prioridades de manutenção. Responda em Português do Brasil de forma concisa.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiSummary(response.text || "Sem resumo disponível.");
    } catch (error) {
      console.error("Erro na IA:", error);
      setAiSummary("Não foi possível gerar a análise da frota agora.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-emerald-700">S</div>
            <h1 className="font-bold">SOLURB DIGITAL</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            {user.role === 'ADMIN' && (
              <button 
                onClick={() => setView('admin')}
                className={`px-3 py-1 rounded font-bold transition-colors ${view === 'admin' ? 'bg-white text-emerald-700' : 'bg-emerald-800 hover:bg-emerald-900'}`}
              >
                GESTÃO
              </button>
            )}
            <div className="hidden sm:flex flex-col items-end leading-none">
              <span className="font-bold">{user.name}</span>
              <span className="text-[9px] opacity-70 uppercase font-black">{user.role}</span>
            </div>
            <button onClick={handleLogout} className="p-1.5 hover:bg-emerald-800 rounded-full transition-colors" title="Sair">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-24">
        {view === 'dashboard' && (
          <Dashboard 
            submissions={entries} 
            user={user}
            onNewChecklist={() => setView('form')} 
            onViewHistory={() => setView('history')}
            onRefresh={fetchEntries}
            aiSummary={aiSummary}
            isSummarizing={isSummarizing}
            generateAiReport={generateAiReport}
          />
        )}
        {view === 'form' && (
          <ChecklistForm 
            user={user} 
            vehicles={vehicles}
            availableItems={checklistItems}
            onSubmit={handleSubmitEntry} 
            onCancel={() => setView('dashboard')} 
          />
        )}
        {view === 'history' && (
          <HistoryView 
            submissions={entries} 
            onBack={() => setView('dashboard')} 
          />
        )}
        {view === 'admin' && (
          <AdminPanel 
            vehicles={vehicles}
            items={checklistItems}
            onRefresh={initAppData}
            onBack={() => setView('dashboard')}
          />
        )}
      </main>
    </div>
  );
};

export default App;

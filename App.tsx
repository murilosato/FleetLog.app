
import React, { useState, useEffect } from 'react';
import { User, ChecklistEntry, Vehicle, DBChecklistItem } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';
import HistoryView from './components/HistoryView';
import { GoogleGenAI } from '@google/genai';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'history'>('dashboard');
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklistItems, setChecklistItems] = useState<DBChecklistItem[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    const initAppData = async () => {
      const [vRes, iRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('checklist_items').select('*')
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (iRes.data) setChecklistItems(iRes.data);
    };
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
      
      // Atualizar KM/Horímetro do veículo
      await supabase.from('vehicles').update({
        current_km: entry.km,
        current_horimetro: entry.horimetro,
        last_updated: Date.now()
      }).eq('id', entry.vehicle_id);

      setEntries([entry, ...entries]);
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
      // Fixed: Always use the exact process.env.API_KEY string for initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise os últimos relatórios de inspeção da frota SOLURB.
      Dados: ${JSON.stringify(entries.slice(0, 5).map(e => ({
        prefix: e.prefix,
        hasIssues: e.has_issues,
        obs: e.general_observations
      })))}
      Forneça um resumo executivo sobre a saúde da frota e prioridades de manutenção.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      // Fixed: Use .text property instead of calling it as a method
      setAiSummary(response.text || "Sem resumo disponível.");
    } catch (error) {
      setAiSummary("Erro na IA.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-emerald-700">S</div>
            <h1 className="font-bold">SOLURB DIGITAL</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            <span className="hidden sm:inline">Olá, <b>{user.name}</b></span>
            <button onClick={handleLogout} className="bg-emerald-800 px-3 py-1 rounded">Sair</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-24">
        {view === 'dashboard' && (
          <Dashboard 
            submissions={entries as any} 
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
            vehicles={vehicles}
            availableItems={checklistItems}
            onSubmit={handleSubmitEntry as any} 
            onCancel={() => setView('dashboard')} 
          />
        )}
        {view === 'history' && (
          <HistoryView 
            submissions={entries as any} 
            onBack={() => setView('dashboard')} 
          />
        )}
      </main>
    </div>
  );
};

export default App;

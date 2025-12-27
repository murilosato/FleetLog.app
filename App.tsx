
import React, { useState, useEffect, useCallback } from 'react';
import { User, ChecklistEntry, Vehicle, DBChecklistItem } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';
import HistoryView from './components/HistoryView';
import AdminPanel from './components/AdminPanel';
import { GoogleGenAI } from '@google/genai';
import { supabase } from './lib/supabase';
import { initDB, saveOfflineEntry, getOfflineEntries, markEntryAsSynced, saveMetadata, getMetadata } from './lib/db';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'history' | 'admin'>('dashboard');
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklistItems, setChecklistItems] = useState<DBChecklistItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) return;
    
    const offlineEntries = await getOfflineEntries();
    if (offlineEntries.length === 0) {
      setPendingSyncCount(0);
      return;
    }

    console.log(`Sincronizando ${offlineEntries.length} vistorias pendentes...`);
    
    for (const entry of offlineEntries) {
      try {
        const { error } = await supabase.from('entries').insert([entry]);
        if (!error) {
          await markEntryAsSynced(entry.id);
          // Atualiza KM/Horímetro no servidor
          await supabase.from('vehicles').update({
            current_km: entry.km,
            current_horimetro: entry.horimetro
          }).eq('id', entry.vehicle_id);
        }
      } catch (err) {
        console.error('Falha ao sincronizar entrada:', entry.id, err);
      }
    }
    
    fetchEntries();
    checkPendingSyncs();
  }, []);

  const checkPendingSyncs = async () => {
    const pending = await getOfflineEntries();
    setPendingSyncCount(pending.length);
  };

  const initAppData = async () => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        const [vRes, iRes, uRes] = await Promise.all([
          supabase.from('vehicles').select('*').order('prefix', { ascending: true }),
          supabase.from('checklist_items').select('*').order('id', { ascending: true }),
          supabase.from('users').select('*')
        ]);
        
        if (vRes.data) {
          setVehicles(vRes.data);
          await saveMetadata('vehicles', vRes.data);
        }
        if (iRes.data) {
          setChecklistItems(iRes.data);
          await saveMetadata('checklist_items', iRes.data);
        }
        if (uRes.data) {
          setUsers(uRes.data as User[]);
          await saveMetadata('users', uRes.data);
        }
      } else {
        // Carrega do Cache Local se estiver offline
        const cachedVehicles = await getMetadata('vehicles');
        const cachedItems = await getMetadata('checklist_items');
        const cachedUsers = await getMetadata('users');
        if (cachedVehicles) setVehicles(cachedVehicles);
        if (cachedItems) setChecklistItems(cachedItems);
        if (cachedUsers) setUsers(cachedUsers);
      }
    } catch (err) {
      console.error('Erro ao inicializar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAppData();
    
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkPendingSyncs();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineData]);

  const fetchEntries = async () => {
    if (!navigator.onLine) return;
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
    if (!navigator.onLine) {
      await saveOfflineEntry(entry);
      checkPendingSyncs();
      alert('Você está offline. A vistoria foi salva no aparelho e será enviada automaticamente assim que houver conexão.');
      setView('dashboard');
      return;
    }

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
      // Fallback para offline se falhar o envio mesmo online
      await saveOfflineEntry(entry);
      checkPendingSyncs();
      setView('dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAiReport = async () => {
    if (!navigator.onLine || entries.length === 0) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise os últimos relatórios de inspeção da frota ecoSCheck.
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
      <header className="bg-[#0A2540] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center font-black text-[#0A2540] text-base sm:text-lg overflow-hidden shadow-inner">
                eS
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0A2540] flex items-center justify-center shadow-lg ${isOnline ? 'bg-[#58CC02]' : 'bg-orange-500'}`}>
                    {isOnline ? (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                    ) : (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    )}
                </div>
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-base sm:text-xl tracking-tight leading-none">ecoSCheck</h1>
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-0.5 ${isOnline ? 'text-[#58CC02]' : 'text-orange-400'}`}>
                {isOnline ? 'Online' : 'Modo Offline'}
              </span>
            </div>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-3">
            <button 
              onClick={() => setView('dashboard')}
              className={`p-2 sm:px-4 sm:py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-[#1E90FF] text-white shadow-lg' : 'hover:bg-white/10 opacity-60'}`}
            >
              <span className="hidden sm:inline">Início</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            </button>
            <button 
              onClick={() => setView('history')}
              className={`p-2 sm:px-4 sm:py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${view === 'history' ? 'bg-[#1E90FF] text-white shadow-lg' : 'hover:bg-white/10 opacity-60'}`}
            >
              <span className="hidden sm:inline">Histórico</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </button>
            {user.role === 'ADMIN' && (
              <button 
                onClick={() => setView('admin')}
                className={`p-2 sm:px-4 sm:py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-[#1E90FF] text-white shadow-lg' : 'hover:bg-white/10 opacity-60'}`}
              >
                <span className="hidden sm:inline">Gestão</span>
                <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-4 border-l border-white/10">
            <button onClick={handleLogout} className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </header>

      {pendingSyncCount > 0 && isOnline && (
        <div className="bg-[#1E90FF] text-white p-3 text-center text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
          Sincronizando {pendingSyncCount} vistorias pendentes...
        </div>
      )}

      {!isOnline && (
        <div className="bg-orange-500 text-white p-3 text-center text-[10px] font-black uppercase tracking-[0.2em]">
          Você está trabalhando offline. Os dados serão salvos localmente.
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-24">
        {view === 'dashboard' && (
          <Dashboard 
            submissions={entries} 
            user={user}
            availableItems={checklistItems}
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
            user={user}
            users={users}
            availableItems={checklistItems}
            onBack={() => setView('dashboard')} 
            onRefresh={fetchEntries}
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


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, ChecklistEntry, Vehicle, DBChecklistItem, RefuelingEntry, LubricantEntry } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';
import RefuelingForm from './components/RefuelingForm';
import LubricantForm from './components/LubricantForm';
import HistoryView from './components/HistoryView';
import RecordsHistoryView from './components/RecordsHistoryView';
import HistoryPortal from './components/HistoryPortal';
import AdminPanel from './components/AdminPanel';
import ReportsView from './components/ReportsView';
import { supabase } from './lib/supabase';
import { saveOfflineEntry, getOfflineEntries, markEntryAsSynced, saveMetadata, getMetadata } from './lib/db';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'refueling' | 'lubricant' | 'history_portal' | 'history_checklists' | 'history_records' | 'admin' | 'reports'>('dashboard');
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [refuelingEntries, setRefuelingEntries] = useState<RefuelingEntry[]>([]);
  const [lubricantEntries, setLubricantEntries] = useState<LubricantEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklistItems, setChecklistItems] = useState<DBChecklistItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const syncingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const [eRes, rRes, lRes] = await Promise.all([
        supabase.from('entries').select('*').order('created_at', { ascending: false }),
        supabase.from('refueling_entries').select('*'),
        supabase.from('lubricant_entries').select('*')
      ]);

      if (eRes.data) setEntries(eRes.data as ChecklistEntry[]);
      if (rRes.data) setRefuelingEntries(rRes.data as RefuelingEntry[]);
      if (lRes.data) setLubricantEntries(lRes.data as LubricantEntry[]);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    }
  }, []);

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
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleLogin = (userData: User) => setUser(userData);
  const handleLogout = () => { setUser(null); setView('dashboard'); };

  const handleSubmitEntry = async (entry: ChecklistEntry) => {
    if (!navigator.onLine) {
      await saveOfflineEntry(entry);
      alert('Vistoria salva localmente.');
      setView('dashboard');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.from('entries').insert([entry]);
      if (error) throw error;
      await supabase.from('vehicles').update({ current_km: entry.km, current_horimetro: entry.horimetro }).eq('id', entry.vehicle_id);
      await fetchData();
      await initAppData();
      setView('dashboard');
    } catch (err) {
      await saveOfflineEntry(entry);
      setView('dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'Administrador';
      case 'OPERACAO': return 'Operação';
      case 'MANUTENCAO': return 'Manutenção';
      case 'OPERADOR': return 'Motorista';
      default: return role;
    }
  };

  const showReports = user.role === 'ADMIN' || user.role === 'OPERACAO';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-[#0A2540] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setView('dashboard')}>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center font-black text-[#0A2540] text-base sm:text-lg overflow-hidden shadow-inner">
                eS
            </div>
            <div className="hidden xs:flex flex-col">
              <h1 className="font-black text-base sm:text-xl tracking-tight leading-none">ecoSCheck</h1>
            </div>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-2 mx-4 overflow-x-auto hide-scrollbar">
            <button onClick={() => setView('dashboard')} className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${view === 'dashboard' ? 'bg-[#1E90FF] text-white' : 'opacity-60 hover:opacity-100'}`}>Início</button>
            <button onClick={() => setView('history_portal')} className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${view.includes('history') ? 'bg-[#1E90FF] text-white' : 'opacity-60 hover:opacity-100'}`}>Históricos</button>
            {showReports && (
              <button onClick={() => setView('reports')} className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${view === 'reports' ? 'bg-[#1E90FF] text-white' : 'opacity-60 hover:opacity-100'}`}>Relatórios</button>
            )}
            {user.role === 'ADMIN' && (
              <button onClick={() => setView('admin')} className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-[#1E90FF] text-white' : 'opacity-60 hover:opacity-100'}`}>Gestão</button>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-1 text-right">
               <span className="text-[11px] font-black uppercase tracking-tight">{user.name}</span>
               <span className="text-[8px] font-black bg-[#1E90FF] text-white px-2 py-0.5 rounded-full uppercase tracking-widest">{getRoleLabel(user.role)}</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-24">
        {view === 'dashboard' && (
          <Dashboard 
            submissions={entries} 
            refuelings={refuelingEntries}
            lubricants={lubricantEntries}
            user={user}
            availableItems={checklistItems}
            onNewChecklist={() => setView('form')} 
            onNewRefueling={() => setView('refueling')}
            onNewLubricant={() => setView('lubricant')}
            onViewHistory={() => setView('history_portal')}
            onRefresh={fetchData}
            aiSummary={null}
            isSummarizing={false}
            generateAiReport={() => {}}
          />
        )}
        {view === 'form' && <ChecklistForm user={user} vehicles={vehicles} availableItems={checklistItems} onSubmit={handleSubmitEntry} onCancel={() => setView('dashboard')} />}
        {view === 'refueling' && <RefuelingForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); initAppData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'lubricant' && <LubricantForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); initAppData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'history_portal' && <HistoryPortal onSelectChecklists={() => setView('history_checklists')} onSelectRecords={() => setView('history_records')} onBack={() => setView('dashboard')} />}
        {view === 'history_checklists' && <HistoryView submissions={entries} user={user} users={users} availableItems={checklistItems} onBack={() => setView('history_portal')} onRefresh={fetchData} />}
        {view === 'history_records' && <RecordsHistoryView onBack={() => setView('history_portal')} />}
        {view === 'admin' && <AdminPanel vehicles={vehicles} items={checklistItems} onRefresh={initAppData} onBack={() => setView('dashboard')} />}
        {view === 'reports' && <ReportsView availableItems={checklistItems} onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
};

export default App;

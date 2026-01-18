
import React, { useState, useEffect, useCallback } from 'react';
import { User, ChecklistEntry, Vehicle, DBChecklistItem, RefuelingEntry, LubricantEntry, MaintenanceSession } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';
import RefuelingForm from './components/RefuelingForm';
import LubricantForm from './components/LubricantForm';
import ServiceOrderForm from './components/ServiceOrderForm';
import MaintenanceTimer from './components/MaintenanceTimer';
import HistoryView from './components/HistoryView';
import RecordsHistoryView from './components/RecordsHistoryView';
import HistoryPortal from './components/HistoryPortal';
import AdminPanel from './components/AdminPanel';
import ReportsView from './components/ReportsView';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'refueling' | 'lubricant' | 'service_order' | 'maintenance_timer' | 'history_portal' | 'history_checklists' | 'history_records' | 'admin' | 'reports'>('dashboard');
  const [initialRecordTab, setInitialRecordTab] = useState<'refueling' | 'lubricant' | 'maintenance' | 'service_order'>('refueling');
  
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [refuelingEntries, setRefuelingEntries] = useState<RefuelingEntry[]>([]);
  const [lubricantEntries, setLubricantEntries] = useState<LubricantEntry[]>([]);
  const [maintenanceSessions, setMaintenanceSessions] = useState<MaintenanceSession[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklistItems, setChecklistItems] = useState<DBChecklistItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Monitoramento de Sessão Profissional (Supabase Auth)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUser(data as User);
      } else if (error) {
        console.error("Erro ao carregar perfil:", error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const [checkRes, refRes, lubRes, maintRes] = await Promise.all([
        supabase.from('checklist_entries').select('*').gte('date', today).order('created_at', { ascending: false }),
        supabase.from('refueling_entries').select('*').gte('event_at', today),
        supabase.from('lubricant_entries').select('*').gte('event_at', today),
        supabase.from('maintenance_sessions').select('*').neq('status', 'FINISHED')
      ]);

      if (checkRes.data) setEntries(checkRes.data as ChecklistEntry[]);
      if (refRes.data) setRefuelingEntries(refRes.data as RefuelingEntry[]);
      if (lubRes.data) setLubricantEntries(lubRes.data as LubricantEntry[]);
      if (maintRes.data) setMaintenanceSessions(maintRes.data as MaintenanceSession[]);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    }
  }, [user]);

  const initAppData = useCallback(async () => {
    if (!user) return;
    try {
      const [vRes, iRes, uRes] = await Promise.all([
        supabase.from('vehicles').select('*').order('prefix'),
        supabase.from('checklist_items').select('*').order('id'),
        supabase.from('users').select('*').order('name')
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (iRes.data) setChecklistItems(iRes.data);
      if (uRes.data) setUsers(uRes.data as User[]);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    if (user) { 
      fetchData(); 
      initAppData(); 
    }
  }, [user, fetchData, initAppData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('dashboard');
  };

  // Trava de Navegação por Hierarquia
  useEffect(() => {
    if (user) {
      if ((view === 'admin' || view === 'reports') && user.role !== 'ADMIN') {
        setView('dashboard');
      }
    }
  }, [view, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00548b]"></div>
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-rajdhani">
      <header className="bg-[#020617] text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setView('dashboard')}>
            <h1 className="text-lg sm:text-2xl font-black tracking-tighter flex items-baseline select-none">
              <span className="text-[#00548b]">FLEET</span>
              <span className="text-[#425466]">LOG</span>
            </h1>
          </div>
          
          <nav className="flex flex-1 items-center gap-2 overflow-x-auto hide-scrollbar sm:justify-center sm:overflow-visible py-2">
            <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-[#00548b] text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}>Painel</button>
            <button onClick={() => setView('history_portal')} className={`px-4 py-2 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${view.includes('history') ? 'bg-[#00548b] text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}>Registros</button>
            {user.role === 'ADMIN' && (
              <>
                <button onClick={() => setView('reports')} className={`px-4 py-2 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${view === 'reports' ? 'bg-[#00548b] text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}>Analytics</button>
                <button onClick={() => setView('admin')} className={`px-4 py-2 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-[#00548b] text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}>Gestão</button>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block border-r border-slate-800 pr-4">
               <p className="text-[10px] font-black text-[#00548b] uppercase leading-none mb-1">{user.role}</p>
               <p className="text-xs font-bold text-slate-300 leading-none truncate max-w-[100px]">{user.name}</p>
            </div>
            <button onClick={handleLogout} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-red-900 transition-colors shadow-sm">
               <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 pb-24">
        {view === 'dashboard' && (
          <Dashboard 
            submissions={entries} refuelings={refuelingEntries} lubricants={lubricantEntries} maintenances={maintenanceSessions}
            user={user} availableItems={checklistItems}
            onNewChecklist={() => setView('form')} onNewRefueling={() => setView('refueling')}
            onNewLubricant={() => setView('lubricant')} onMaintenanceTimer={() => setView('maintenance_timer')}
            onViewHistory={() => setView('history_portal')} onRefresh={fetchData}
            onNewOS={() => setView('service_order')}
            aiSummary={null} isSummarizing={false} generateAiReport={() => {}}
          />
        )}
        {view === 'form' && <ChecklistForm user={user} vehicles={vehicles} availableItems={checklistItems} onSubmit={() => { fetchData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'refueling' && <RefuelingForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'lubricant' && <LubricantForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'service_order' && <ServiceOrderForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'maintenance_timer' && <MaintenanceTimer user={user} vehicles={vehicles} onBack={() => setView('dashboard')} />}
        {view === 'history_portal' && <HistoryPortal onSelectChecklists={() => setView('history_checklists')} onSelectRefueling={() => { setInitialRecordTab('refueling'); setView('history_records'); }} onSelectLubricant={() => { setInitialRecordTab('lubricant'); setView('history_records'); }} onSelectMaintenance={() => { setInitialRecordTab('maintenance'); setView('history_records'); }} onSelectServiceOrder={() => { setInitialRecordTab('service_order'); setView('history_records'); }} onBack={() => setView('dashboard')} />}
        {view === 'history_checklists' && <HistoryView submissions={entries} user={user} users={users} availableItems={checklistItems} onBack={() => setView('history_portal')} onRefresh={fetchData} />}
        {view === 'history_records' && <RecordsHistoryView onBack={() => setView('history_portal')} initialTab={initialRecordTab} currentUser={user} />}
        {view === 'admin' && <AdminPanel vehicles={vehicles} items={checklistItems} onRefresh={initAppData} onBack={() => setView('dashboard')} />}
        {view === 'reports' && <ReportsView availableItems={checklistItems} onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
};

export default App;

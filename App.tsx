
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
  const [isLoading, setIsLoading] = useState(false);

  // Verificação de Sessão Persistente
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (userData) setUser(userData as User);
      }
    };
    checkSession();
  }, []);

  const fetchData = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    try {
      // O RLS no Supabase já filtrará por company_id automaticamente, 
      // mas mantemos as cláusulas explícitas para redundância e performance.
      const today = new Date().toISOString().split('T')[0];
      const [checkRes, refRes, lubRes, maintRes] = await Promise.all([
        supabase.from('checklist_entries').select('*').eq('company_id', user.company_id).gte('date', today),
        supabase.from('refueling_entries').select('*').eq('company_id', user.company_id).gte('event_at', today),
        supabase.from('lubricant_entries').select('*').eq('company_id', user.company_id).gte('event_at', today),
        supabase.from('maintenance_sessions').select('*').eq('company_id', user.company_id).neq('status', 'FINISHED')
      ]);

      if (checkRes.data) setEntries(checkRes.data as ChecklistEntry[]);
      if (refRes.data) setRefuelingEntries(refRes.data as RefuelingEntry[]);
      if (lubRes.data) setLubricantEntries(lubRes.data as LubricantEntry[]);
      if (maintRes.data) setMaintenanceSessions(maintRes.data as MaintenanceSession[]);
    } catch (err) {
      console.error('Erro de sincronização multi-empresa:', err);
    }
  }, [user]);

  const initAppData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [vRes, iRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('company_id', user.company_id).order('prefix'),
        supabase.from('checklist_items').select('*').eq('company_id', user.company_id).order('id')
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (iRes.data) setChecklistItems(iRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) { fetchData(); initAppData(); }
  }, [user, fetchData, initAppData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('dashboard');
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-rajdhani">
      <header className="bg-[#020617] text-white shadow-lg sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setView('dashboard')}>
            <h1 className="text-lg sm:text-2xl font-black tracking-tighter flex items-baseline select-none">
              <span className="text-[#00f2ff]">FLEET</span>
              <span className="text-slate-400">LOG</span>
            </h1>
          </div>
          
          <nav className="flex flex-1 items-center gap-2 overflow-x-auto hide-scrollbar sm:justify-center sm:overflow-visible py-2">
            <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${view === 'dashboard' ? 'bg-[#00f2ff] text-[#020617] shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'opacity-50 hover:opacity-100'}`}>Painel</button>
            <button onClick={() => setView('history_portal')} className={`px-4 py-2 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${view.includes('history') ? 'bg-[#00f2ff] text-[#020617]' : 'opacity-50 hover:opacity-100'}`}>Registros</button>
            {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
              <>
                <button onClick={() => setView('reports')} className={`px-4 py-2 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${view === 'reports' ? 'bg-[#00f2ff] text-[#020617]' : 'opacity-50 hover:opacity-100'}`}>Analytics</button>
                <button onClick={() => setView('admin')} className={`px-4 py-2 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${view === 'admin' ? 'bg-[#00f2ff] text-[#020617]' : 'opacity-50 hover:opacity-100'}`}>Gestão</button>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block border-r border-white/10 pr-4">
               <p className="text-[10px] font-black text-[#00f2ff] uppercase leading-none mb-1">{user.role}</p>
               <p className="text-xs font-bold text-slate-400 leading-none truncate max-w-[100px]">{user.name}</p>
            </div>
            <button onClick={handleLogout} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 hover:border-red-500/30 transition-all shadow-sm">
               <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
        {/* Outras telas seguem injetando o user.company_id em cada insert */}
        {view === 'admin' && <AdminPanel vehicles={vehicles} items={checklistItems} onRefresh={initAppData} onBack={() => setView('dashboard')} />}
        {view === 'reports' && <ReportsView availableItems={checklistItems} onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
};

export default App;

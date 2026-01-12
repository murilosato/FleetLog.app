
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, ChecklistEntry, Vehicle, DBChecklistItem, RefuelingEntry, LubricantEntry, MaintenanceSession, ServiceOrder } from './types';
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
import { saveOfflineEntry, saveMetadata, getMetadata } from './lib/db';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'refueling' | 'lubricant' | 'service_order' | 'maintenance_timer' | 'history_portal' | 'history_checklists' | 'history_records' | 'admin' | 'reports'>('dashboard');
  const [initialRecordTab, setInitialRecordTab] = useState<'refueling' | 'lubricant' | 'maintenance' | 'service_order'>('refueling');
  const [selectedMaintId, setSelectedMaintId] = useState<string | null>(null);
  const [osInitialData, setOsInitialData] = useState<{vehicle_id?: string, km?: number, hor?: number, description?: string}>({});
  
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [refuelingEntries, setRefuelingEntries] = useState<RefuelingEntry[]>([]);
  const [lubricantEntries, setLubricantEntries] = useState<LubricantEntry[]>([]);
  const [maintenanceSessions, setMaintenanceSessions] = useState<MaintenanceSession[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklistItems, setChecklistItems] = useState<DBChecklistItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: checklists } = await supabase.from('checklist_entries').select('*').gte('date', today).order('created_at', { ascending: false });
      const { data: refueling } = await supabase.from('refueling_entries').select('*').gte('event_at', today);
      const { data: lubricants } = await supabase.from('lubricant_entries').select('*').gte('event_at', today);
      const { data: maintenance } = await supabase.from('maintenance_sessions').select('*').neq('status', 'FINISHED');

      if (checklists) setEntries(checklists as ChecklistEntry[]);
      if (refueling) setRefuelingEntries(refueling as RefuelingEntry[]);
      if (lubricants) setLubricantEntries(lubricants as LubricantEntry[]);
      if (maintenance) setMaintenanceSessions(maintenance as MaintenanceSession[]);
    } catch (err) {
      console.error('Erro ao buscar dados do Dashboard:', err);
    }
  }, []);

  const initAppData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        const [vRes, iRes, uRes] = await Promise.all([
          supabase.from('vehicles').select('*').order('prefix'),
          supabase.from('checklist_items').select('*').order('id'),
          supabase.from('users').select('*').order('name')
        ]);
        if (vRes.data) setVehicles(vRes.data);
        if (iRes.data) setChecklistItems(iRes.data);
        if (uRes.data) setUsers(uRes.data as User[]);
      }
    } catch (err: any) {
      setDbError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) { fetchData(); initAppData(); }
  }, [user, fetchData, initAppData]);

  const handleSubmitEntry = async (entry: ChecklistEntry) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('checklist_entries').insert([entry]);
      if (error) throw error;
      await supabase.from('vehicles').update({ current_km: entry.km, current_horimetro: entry.horimetro }).eq('id', entry.vehicle_id);
      
      if (entry.has_issues) {
        if (confirm("Checklist com pendências. Abrir Ordem de Serviço?")) {
           setOsInitialData({ 
             vehicle_id: entry.vehicle_id, 
             km: entry.km, 
             hor: entry.horimetro,
             description: entry.general_observations || ''
           });
           setView('service_order');
           return;
        }
      }
      setView('dashboard');
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-[#020617] text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter flex items-baseline select-none">
              <span className="text-[#00548b]">FLEET</span>
              <span className="text-[#425466]">LOG</span>
            </h1>
          </div>
          <nav className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest ${view === 'dashboard' ? 'bg-[#00548b]' : 'opacity-60'}`}>Painel</button>
            <button onClick={() => setView('history_portal')} className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest ${view.includes('history') ? 'bg-[#00548b]' : 'opacity-60'}`}>Registros</button>
            <button onClick={() => setView('reports')} className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest ${view === 'reports' ? 'bg-[#00548b]' : 'opacity-60'}`}>Analytics</button>
            {user.role === 'ADMIN' && (
              <button onClick={() => setView('admin')} className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest ${view === 'admin' ? 'bg-[#00548b]' : 'opacity-60'}`}>Gestão</button>
            )}
          </nav>
          <button onClick={() => setUser(null)} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
             <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-24">
        {view === 'dashboard' && (
          <Dashboard 
            submissions={entries} refuelings={refuelingEntries} lubricants={lubricantEntries} maintenances={maintenanceSessions}
            user={user} availableItems={checklistItems}
            onNewChecklist={() => setView('form')} onNewRefueling={() => setView('refueling')}
            onNewLubricant={() => setView('lubricant')} onMaintenanceTimer={() => setView('maintenance_timer')}
            onViewHistory={() => setView('history_portal')} onRefresh={fetchData}
            onNewOS={() => { setOsInitialData({}); setView('service_order'); }}
            aiSummary={null} isSummarizing={false} generateAiReport={() => {}}
          />
        )}
        {view === 'form' && <ChecklistForm user={user} vehicles={vehicles} availableItems={checklistItems} onSubmit={handleSubmitEntry} onCancel={() => setView('dashboard')} />}
        {view === 'refueling' && <RefuelingForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'lubricant' && <LubricantForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'service_order' && <ServiceOrderForm user={user} vehicles={vehicles} {...osInitialData} onSubmit={() => { fetchData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'maintenance_timer' && <MaintenanceTimer user={user} vehicles={vehicles} onBack={() => setView('dashboard')} />}
        {view === 'history_portal' && <HistoryPortal onSelectChecklists={() => setView('history_checklists')} onSelectRefueling={() => { setInitialRecordTab('refueling'); setView('history_records'); }} onSelectLubricant={() => { setInitialRecordTab('lubricant'); setView('history_records'); }} onSelectMaintenance={() => { setInitialRecordTab('maintenance'); setView('history_records'); }} onSelectServiceOrder={() => { setInitialRecordTab('service_order'); setView('history_records'); }} onBack={() => setView('dashboard')} />}
        {view === 'history_checklists' && <HistoryView submissions={entries} user={user} users={users} availableItems={checklistItems} onBack={() => setView('history_portal')} onRefresh={fetchData} />}
        {view === 'history_records' && <RecordsHistoryView onBack={() => setView('history_portal')} initialTab={initialRecordTab} />}
        {view === 'admin' && <AdminPanel vehicles={vehicles} items={checklistItems} onRefresh={initAppData} onBack={() => setView('dashboard')} />}
        {view === 'reports' && <ReportsView availableItems={checklistItems} onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
};

export default App;

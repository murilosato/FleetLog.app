
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
      const { data: checklists, error: e1 } = await supabase.from('checklist_entries').select('*').order('created_at', { ascending: false });
      const { data: refueling, error: e2 } = await supabase.from('refueling_entries').select('*');
      const { data: lubricants, error: e3 } = await supabase.from('lubricant_entries').select('*');
      const { data: maintenance, error: e4 } = await supabase.from('maintenance_sessions').select('*');

      if (e1 || e2 || e3 || e4) {
        console.warn("Algumas tabelas de histórico podem estar vazias ou inacessíveis.");
      }

      if (checklists) setEntries(checklists as ChecklistEntry[]);
      if (refueling) setRefuelingEntries(refueling as RefuelingEntry[]);
      if (lubricants) setLubricantEntries(lubricantEntries as LubricantEntry[]);
      if (maintenance) setMaintenanceSessions(maintenance as MaintenanceSession[]);
    } catch (err) {
      console.error('Erro ao buscar dados do Dashboard:', err);
    }
  }, []);

  const initAppData = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      if (navigator.onLine) {
        const vRes = await supabase.from('vehicles').select('*').order('prefix', { ascending: true });
        if (vRes.error) throw vRes.error;
        if (vRes.data) {
          setVehicles(vRes.data);
          await saveMetadata('vehicles', vRes.data);
        }

        const iRes = await supabase.from('checklist_items').select('*').order('id', { ascending: true });
        if (iRes.data) {
          setChecklistItems(iRes.data);
          await saveMetadata('checklist_items', iRes.data);
        }

        const uRes = await supabase.from('users').select('*');
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
    } catch (err: any) {
      console.error('Erro ao inicializar dados mestres:', err);
      setDbError(err.message || 'Erro de conexão com o banco de dados.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAppData();
  }, [initAppData]);

  useEffect(() => {
    if (user) {
      fetchData();
      initAppData();
    }
  }, [user, fetchData, initAppData]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => { setUser(null); setView('dashboard'); };

  const handleOpenOS = (data: {vehicle_id?: string, km?: number, hor?: number, description?: string}) => {
    setOsInitialData(data);
    setView('service_order');
  };

  const handleSubmitEntry = async (entry: ChecklistEntry) => {
    if (!navigator.onLine) {
      await saveOfflineEntry(entry);
      alert('Vistoria salva localmente.');
      setView('dashboard');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.from('checklist_entries').insert([entry]);
      if (error) throw error;
      await supabase.from('vehicles').update({ current_km: entry.km, current_horimetro: entry.horimetro }).eq('id', entry.vehicle_id);
      await fetchData();
      await initAppData();
      
      if (entry.has_issues) {
        if (confirm("Checklist finalizado com pendências. Deseja abrir uma Ordem de Serviço agora?")) {
           handleOpenOS({ 
             vehicle_id: entry.vehicle_id, 
             km: entry.km, 
             hor: entry.horimetro,
             description: `Gerado automaticamente via Checklist. Problemas relatados: ${entry.general_observations || 'Consultar checklist'}`
           });
           return;
        }
      }
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
      <header className="bg-[#020617] text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => { setView('dashboard'); setSelectedMaintId(null); }}>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter flex items-baseline select-none">
              <span className="text-[#00548b]">FLEET</span>
              <span className="text-[#425466]">LOG</span>
            </h1>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-2 mx-4 overflow-x-auto hide-scrollbar">
            <button onClick={() => { setView('dashboard'); setSelectedMaintId(null); }} className={`px-3 py-2 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] transition-all whitespace-nowrap ${view === 'dashboard' ? 'bg-[#00548b] text-white' : 'opacity-60 hover:opacity-100'}`}>Painel</button>
            <button onClick={() => { setView('history_portal'); setSelectedMaintId(null); }} className={`px-3 py-2 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] transition-all ${view.includes('history') ? 'bg-[#00548b] text-white' : 'opacity-60 hover:opacity-100'}`}>Log</button>
            {showReports && (
              <button onClick={() => { setView('reports'); setSelectedMaintId(null); }} className={`px-3 py-2 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] transition-all ${view === 'reports' ? 'bg-[#00548b] text-white' : 'opacity-60 hover:opacity-100'}`}>Analytics</button>
            )}
            {user.role === 'ADMIN' && (
              <button onClick={() => { setView('admin'); setSelectedMaintId(null); }} className={`px-3 py-2 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] transition-all ${view === 'admin' ? 'bg-[#00548b] text-white' : 'opacity-60 hover:opacity-100'}`}>Gestão</button>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-1 text-right">
               <span className="text-[11px] font-black uppercase tracking-tight">{user.name}</span>
               <span className="text-[8px] font-black bg-[#00548b]/10 text-[#00548b] border border-[#00548b]/20 px-2 py-0.5 rounded-full uppercase tracking-widest">{getRoleLabel(user.role)}</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </header>

      {dbError && (
        <div className="bg-red-600 text-white p-2 text-center text-[10px] font-black uppercase tracking-widest animate-pulse">
          Problema de conexão: {dbError} | <button onClick={() => initAppData()} className="underline">Tentar Novamente</button>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-24">
        {view === 'dashboard' && (
          <Dashboard 
            submissions={entries} 
            refuelings={refuelingEntries}
            lubricants={lubricantEntries}
            maintenances={maintenanceSessions}
            user={user}
            availableItems={checklistItems}
            onNewChecklist={() => setView('form')} 
            onNewRefueling={() => setView('refueling')}
            onNewLubricant={() => setView('lubricant')}
            onMaintenanceTimer={() => { setView('maintenance_timer'); setSelectedMaintId(null); }}
            onViewHistory={() => setView('history_portal')}
            onRefresh={() => { fetchData(); initAppData(); }}
            aiSummary={null}
            isSummarizing={false}
            generateAiReport={() => {}}
            onNewOS={() => { setOsInitialData({}); setView('service_order'); }}
          />
        )}
        {view === 'form' && <ChecklistForm user={user} vehicles={vehicles} availableItems={checklistItems} onSubmit={handleSubmitEntry} onCancel={() => setView('dashboard')} />}
        {view === 'refueling' && <RefuelingForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); initAppData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'lubricant' && <LubricantForm user={user} vehicles={vehicles} onSubmit={() => { fetchData(); initAppData(); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        {view === 'service_order' && (
          <ServiceOrderForm 
            user={user} 
            vehicles={vehicles} 
            initialVehicleId={osInitialData.vehicle_id}
            initialKm={osInitialData.km}
            initialHor={osInitialData.hor}
            initialDescription={osInitialData.description}
            onSubmit={() => { fetchData(); initAppData(); setView('dashboard'); }} 
            onCancel={() => setView('dashboard')} 
          />
        )}
        {view === 'maintenance_timer' && (
          <MaintenanceTimer 
            user={user} 
            vehicles={vehicles} 
            initialSessionId={selectedMaintId}
            onBack={() => { setView('dashboard'); setSelectedMaintId(null); }} 
          />
        )}
        {view === 'history_portal' && (
          <HistoryPortal 
            onSelectChecklists={() => setView('history_checklists')} 
            onSelectRefueling={() => { setInitialRecordTab('refueling'); setView('history_records'); }}
            onSelectLubricant={() => { setInitialRecordTab('lubricant'); setView('history_records'); }}
            onSelectMaintenance={() => { setInitialRecordTab('maintenance'); setView('history_records'); }}
            onSelectServiceOrder={() => { setInitialRecordTab('service_order'); setView('history_records'); }}
            onBack={() => setView('dashboard')} 
          />
        )}
        {view === 'history_checklists' && <HistoryView submissions={entries} user={user} users={users} availableItems={checklistItems} onBack={() => setView('history_portal')} onRefresh={fetchData} />}
        {view === 'history_records' && (
          <RecordsHistoryView 
            onBack={() => setView('history_portal')} 
            initialTab={initialRecordTab}
            onOpenMaintenance={(id) => { setSelectedMaintId(id); setView('maintenance_timer'); }}
          />
        )}
        {view === 'admin' && <AdminPanel vehicles={vehicles} items={checklistItems} onRefresh={initAppData} onBack={() => setView('dashboard')} />}
        {view === 'reports' && <ReportsView availableItems={checklistItems} onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
};

export default App;

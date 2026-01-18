
import React, { useState, useEffect } from 'react';
import { User, Vehicle, DBChecklistItem, ChecklistEntry } from './types';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'checklist'>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [items, setItems] = useState<DBChecklistItem[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchUserProfile(session.user.id);
    });
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) setUser(data as User);
  };

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        const [vRes, iRes] = await Promise.all([
          supabase.from('vehicles').select('*').eq('company_id', user.company_id).order('prefix'),
          supabase.from('checklist_items').select('*').eq('company_id', user.company_id).order('id')
        ]);
        if (vRes.data) setVehicles(vRes.data);
        if (iRes.data) setItems(iRes.data);
      };
      loadData();
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-slate-50 font-rajdhani">
      <header className="bg-[#020617] text-white p-6 shadow-xl flex justify-between items-center border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">
            <span className="text-[#00f2ff]">FLEET</span>LOG
          </h1>
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Operação Ativa</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-black text-[#00f2ff] uppercase">{user.role}</p>
            <p className="text-xs font-bold text-slate-400">{user.name}</p>
          </div>
          <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all">Sair</button>
        </div>
      </header>

      <main className="p-6">
        {view === 'dashboard' && (
          <Dashboard 
            user={user} 
            onNewChecklist={() => setView('checklist')}
            submissions={[]} refuelings={[]} lubricants={[]} maintenances={[]} availableItems={items} 
            onNewRefueling={()=>{}} onNewLubricant={()=>{}} onNewOS={()=>{}} onMaintenanceTimer={()=>{}} 
            onViewHistory={()=>{}} onRefresh={()=>{}} aiSummary={null} isSummarizing={false} 
            generateAiReport={()=>{}}
          />
        )}
        {view === 'checklist' && (
          <ChecklistForm 
            user={user} 
            vehicles={vehicles} 
            availableItems={items} 
            onSubmit={() => setView('dashboard')} 
            onCancel={() => setView('dashboard')} 
          />
        )}
      </main>
    </div>
  );
};

export default App;


import React, { useState, useMemo } from 'react';
import { ChecklistEntry, User, DBChecklistItem, RefuelingEntry, LubricantEntry } from '../types';

interface DashboardProps {
  submissions: ChecklistEntry[];
  refuelings: RefuelingEntry[];
  lubricants: LubricantEntry[];
  user: User;
  availableItems: DBChecklistItem[];
  onNewChecklist: () => void;
  onNewRefueling: () => void;
  onNewLubricant: () => void;
  onMaintenanceTimer: () => void;
  onViewHistory: () => void;
  onRefresh: () => void;
  aiSummary: string | null;
  isSummarizing: boolean;
  generateAiReport: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  submissions, 
  refuelings = [],
  lubricants = [],
  user,
  onNewChecklist, 
  onNewRefueling,
  onNewLubricant,
  onMaintenanceTimer,
  onViewHistory
}) => {
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const dailyChecklists = useMemo(() => 
    submissions.filter(s => s.date === dashboardDate), 
    [submissions, dashboardDate]
  );

  const dailyRefuelings = useMemo(() => 
    refuelings.filter(r => r.event_at.startsWith(dashboardDate)), 
    [refuelings, dashboardDate]
  );

  const dailyLubricants = useMemo(() => 
    lubricants.filter(l => l.event_at.startsWith(dashboardDate)), 
    [lubricants, dashboardDate]
  );

  const counts = useMemo(() => {
    const isOperador = user.role === 'OPERADOR';
    return {
      checklists: isOperador ? dailyChecklists.filter(s => s.user_id === user.id).length : dailyChecklists.length,
      refuelings: isOperador ? dailyRefuelings.filter(r => r.user_id === user.id).length : dailyRefuelings.length,
      lubricants: isOperador ? dailyLubricants.filter(l => l.user_id === user.id).length : dailyLubricants.length,
    };
  }, [dailyChecklists, dailyRefuelings, dailyLubricants, user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const canAccessMaintenance = user.role === 'ADMIN' || user.role === 'MANUTENCAO';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#1E90FF]/10 text-[#1E90FF] text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">Painel Operacional</span>
            <span className="text-slate-300 font-bold text-[9px] uppercase tracking-widest">{formatDateDisplay(dashboardDate)}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A2540] tracking-tight">
            {getGreeting()}, <span className="text-[#1E90FF]">{user.name.split(' ')[0]}</span>
          </h2>
        </div>
        
        <div className="group flex items-center gap-3 bg-slate-50 p-1.5 pl-4 rounded-xl border border-slate-100 w-full md:w-auto shadow-inner">
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest shrink-0">Data:</label>
          <input 
            type="date" 
            value={dashboardDate} 
            onChange={e => setDashboardDate(e.target.value)} 
            className="bg-white px-3 py-1.5 rounded-lg font-bold text-xs text-[#0A2540] shadow-sm outline-none border-0 cursor-pointer" 
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-${canAccessMaintenance ? '4' : '3'} gap-4`}>
        <button onClick={onNewChecklist} className="bg-[#0A2540] p-6 rounded-3xl text-white shadow-lg hover:translate-y-[-2px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 group">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-widest">Checklist</h3>
            <p className="text-[10px] font-bold text-blue-300 opacity-80">Iniciar Vistoria</p>
          </div>
        </button>

        <button onClick={onNewRefueling} className="bg-[#58CC02] p-6 rounded-3xl text-white shadow-lg hover:translate-y-[-2px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 group">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-widest">Abastecimento</h3>
            <p className="text-[10px] font-bold text-green-100 opacity-80">Diesel e ARLA</p>
          </div>
        </button>

        <button onClick={onNewLubricant} className="bg-[#FFA500] p-6 rounded-3xl text-white shadow-lg hover:translate-y-[-2px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 group">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-widest">Lubrificante</h3>
            <p className="text-[10px] font-bold text-orange-50 opacity-80">Óleo e Graxa</p>
          </div>
        </button>

        {canAccessMaintenance && (
          <button onClick={onMaintenanceTimer} className="bg-red-600 p-6 rounded-3xl text-white shadow-lg hover:translate-y-[-2px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8"></div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-widest">Oficina</h3>
              <p className="text-[10px] font-bold text-red-100 opacity-80">Timer de Manutenção</p>
            </div>
          </button>
        )}

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0A2540]">
               <svg className="w-6 h-6 text-slate-200" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
            </div>
            <div>
              <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-0.5">Vistorias Hoje</p>
              <p className="text-2xl font-black text-[#0A2540]">{counts.checklists}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#58CC02]">
               <svg className="w-6 h-6 text-slate-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>
            </div>
            <div>
              <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-0.5">Abastecimentos Hoje</p>
              <p className="text-2xl font-black text-[#0A2540]">{counts.refuelings}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#FFA500]">
               <svg className="w-6 h-6 text-slate-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd"/></svg>
            </div>
            <div>
              <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-0.5">Lubrificantes Hoje</p>
              <p className="text-2xl font-black text-[#0A2540]">{counts.lubricants}</p>
            </div>
          </div>
      </div>

      <div className="pt-2">
        <button onClick={onViewHistory} className="w-full px-8 py-4 bg-white border border-slate-100 text-[#0A2540] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 group">
          Acessar Histórico Completo
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;

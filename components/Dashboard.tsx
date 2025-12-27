
import React, { useState, useMemo } from 'react';
import { ChecklistEntry, User, DBChecklistItem } from '../types';

interface DashboardProps {
  submissions: ChecklistEntry[];
  user: User;
  availableItems: DBChecklistItem[];
  onNewChecklist: () => void;
  onNewRefueling: () => void;
  onNewLubricant: () => void;
  onViewHistory: () => void;
  onRefresh: () => void;
  aiSummary: string | null;
  isSummarizing: boolean;
  generateAiReport: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  submissions, 
  user,
  onNewChecklist, 
  onNewRefueling,
  onNewLubricant,
  onViewHistory
}) => {
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const dailySubmissions = useMemo(() => 
    submissions.filter(s => s.date === dashboardDate), 
    [submissions, dashboardDate]
  );

  const displayCount = useMemo(() => {
    if (user.role === 'OPERADOR') {
      return dailySubmissions.filter(s => s.user_id === user.id).length;
    }
    return dailySubmissions.length;
  }, [dailySubmissions, user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* Header Section Compacto */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#1E90FF]/10 text-[#1E90FF] text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">Dashboard</span>
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

      {/* Main Actions Grid Redimensionado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Primary Action: Checklist (Col 1-7) */}
        <div 
          onClick={onNewChecklist} 
          className="lg:col-span-7 bg-[#0A2540] relative overflow-hidden p-8 rounded-3xl text-white shadow-xl cursor-pointer hover:shadow-blue-900/10 hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between group h-full min-h-[220px]"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#1E90FF]/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-[#1E90FF]/20 transition-all"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10 group-hover:scale-105 transition-transform">
               <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight">Novo Checklist</h2>
            <p className="text-blue-200 font-bold mt-2 text-xs opacity-80 group-hover:opacity-100 transition-opacity">Iniciar vistoria de saída ou retorno.</p>
          </div>
          
          <div className="relative z-10 flex items-center gap-3 mt-6">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-[#1E90FF] px-4 py-1.5 rounded-lg shadow-lg shadow-blue-500/20">Iniciar</span>
            <div className="h-[1px] flex-1 bg-white/10"></div>
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-[#0A2540] transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          </div>
        </div>

        {/* Secondary Actions (Col 8-12) */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-5">
          
          {/* Refueling Card */}
          <div 
            onClick={onNewRefueling} 
            className="bg-[#58CC02] p-6 rounded-3xl text-white shadow-lg cursor-pointer hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-between group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            <div className="relative z-10">
              <h3 className="text-lg font-black tracking-tight uppercase">Abastecimento</h3>
              <p className="text-green-50 font-bold text-[9px] uppercase mt-1 tracking-widest opacity-80">Diesel e ARLA</p>
            </div>
            <div className="relative z-10 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:rotate-6 transition-transform">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
          </div>

          {/* Lubricant Card */}
          <div 
            onClick={onNewLubricant} 
            className="bg-[#FFA500] p-6 rounded-3xl text-white shadow-lg cursor-pointer hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-between group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            <div className="relative z-10">
              <h3 className="text-lg font-black tracking-tight uppercase">Lubrificante</h3>
              <p className="text-orange-50 font-bold text-[9px] uppercase mt-1 tracking-widest opacity-80">Óleo e Graxa</p>
            </div>
            <div className="relative z-10 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:rotate-6 transition-transform">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            </div>
          </div>

        </div>
      </div>

      {/* Stats Section Refinada */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="relative">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0A2540] border border-slate-100">
                 <svg className="w-8 h-8 text-slate-200" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#1E90FF] rounded-full border-2 border-white flex items-center justify-center shadow-md">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
              </div>
            </div>
            <div>
              <h2 className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-0.5">Vistorias Hoje</h2>
              <p className="text-4xl font-black text-[#0A2540] tracking-tight">{displayCount}</p>
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <button 
              onClick={onViewHistory} 
              className="w-full md:w-auto px-8 py-3.5 bg-[#0A2540] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-[#1E90FF] transition-all flex items-center justify-center gap-3 group"
            >
              Consultar Históricos
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </button>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;

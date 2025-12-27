
import React, { useState, useMemo } from 'react';
import { ChecklistEntry, ItemStatus, User, DBChecklistItem } from '../types';
import { supabase } from '../lib/supabase';
import { OFFICIAL_SOLURB_ITEMS } from '../constants';

interface DashboardProps {
  submissions: ChecklistEntry[];
  user: User;
  availableItems: DBChecklistItem[];
  onNewChecklist: () => void;
  onViewHistory: () => void;
  onRefresh: () => void;
  aiSummary: string | null;
  isSummarizing: boolean;
  generateAiReport: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  submissions, 
  user,
  availableItems,
  onNewChecklist, 
  onViewHistory,
  onRefresh,
  aiSummary,
  isSummarizing,
  generateAiReport
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

  const maintenanceBacklog = dailySubmissions.filter(s => 
    !s.maintenance_checked && 
    (s.has_divergence || Object.entries(s.items).some(([id, data]: [string, any]) => data.status === ItemStatus.DEFECTIVE))
  );

  const operationBacklog = dailySubmissions.filter(s => 
    !s.operation_checked && 
    Object.entries(s.items).some(([id, data]: [string, any]) => data.status === ItemStatus.MISSING)
  );

  const handleResolveIssue = async (entryId: string, role: 'MANUTENCAO' | 'OPERACAO') => {
    const update = role === 'MANUTENCAO' 
      ? { maintenance_checked: true, maintenance_user_id: user.id }
      : { operation_checked: true, operation_user_id: user.id };

    try {
      const { error } = await supabase
        .from('entries')
        .update(update)
        .eq('id', entryId);
      
      if (error) throw error;
      onRefresh();
    } catch (err) {
      alert("Erro ao validar o documento.");
    }
  };

  const getIssueSummary = (entry: ChecklistEntry, filterStatus: ItemStatus) => {
    const prefix = filterStatus === ItemStatus.DEFECTIVE ? 'DEFEITO: ' : 'FALTA: ';
    const items = Object.entries(entry.items)
      .filter(([id, data]: [string, any]) => data.status === filterStatus)
      .map(([id, _]) => {
        const numericId = parseInt(id);
        const dbItem = availableItems.find(i => i.id === numericId);
        if (dbItem) {
          const clean = dbItem.label.replace(/^\d+\.\s*/, '');
          return clean;
        }
        const item = OFFICIAL_SOLURB_ITEMS.find(i => i.id === numericId);
        if (item) {
          const clean = item.label.replace(/^\d+\.\s*/, '');
          return clean;
        }
        return `Item ${id}`;
      });

    if (items.length === 0) return entry.has_divergence ? 'DIVERGÊNCIA DE RETORNO' : '';
    
    const text = items.slice(0, 3).join(', ') + (items.length > 3 ? '...' : '');
    return `${prefix}${text.toUpperCase()}`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A2540] tracking-tight flex items-center gap-3 sm:gap-4">
             <div className="w-2 h-8 sm:w-2.5 sm:h-10 bg-[#1E90FF] rounded-full"></div>
             Visão Geral
          </h2>
          <p className="text-slate-400 font-bold text-xs sm:text-sm mt-1">Frota em tempo real • {formatDateDisplay(dashboardDate)}</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 bg-slate-50 p-2 pl-4 sm:pl-5 rounded-xl sm:rounded-[2rem] border border-slate-100 w-full sm:w-auto">
          <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest shrink-0">Data Filtro:</label>
          <input type="date" value={dashboardDate} onChange={e => setDashboardDate(e.target.value)} className="bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-2xl font-black text-xs sm:text-sm text-[#0A2540] shadow-sm outline-none border-0 w-full sm:w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div onClick={onNewChecklist} className="bg-[#1E90FF] p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] text-white shadow-2xl shadow-blue-100 cursor-pointer hover:bg-[#0A2540] transition-all flex items-center justify-between group active:scale-[0.98]">
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">Novo Checklist</h2>
            <p className="opacity-80 font-bold mt-1 sm:mt-2 text-xs sm:text-sm">Clique para iniciar agora</p>
          </div>
          <div className="bg-white/20 p-4 sm:p-6 rounded-xl sm:rounded-[2rem] group-hover:scale-110 transition-transform shadow-lg backdrop-blur-md">
            <svg className="w-8 h-8 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
          </div>
        </div>

        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] mb-2 sm:mb-3">Processado Hoje</h2>
            <p className="text-5xl sm:text-6xl font-black text-[#0A2540] tracking-tighter">{displayCount}</p>
            <button onClick={onViewHistory} className="mt-4 sm:mt-6 text-[#1E90FF] font-black text-[10px] sm:text-xs uppercase tracking-widest hover:underline flex items-center gap-2">Ver Histórico</button>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
             <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
          </div>
        </div>
      </div>

      {(user.role === 'ADMIN' || user.role === 'MANUTENCAO') && maintenanceBacklog.length > 0 && (
        <div className="bg-red-50/30 border border-red-100 rounded-[2rem] sm:rounded-[3rem] overflow-hidden">
          <div className="px-6 sm:px-10 py-4 sm:py-6 bg-[#0A2540] text-white flex justify-between items-center">
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Aguardando visto da Manutenção</h3>
            <span className="bg-red-600 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black">{maintenanceBacklog.length}</span>
          </div>
          <div className="p-4 sm:p-8 space-y-4 sm:space-y-5">
            {maintenanceBacklog.map(s => (
              <div key={s.id} className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-red-100 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 group transition-all">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white border-2 border-red-500 rounded-xl flex items-center justify-center text-center p-2 shrink-0">
                   <span className="font-black text-red-600 text-lg sm:text-xl leading-none">{s.prefix}</span>
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-base sm:text-lg font-black text-[#0A2540] uppercase tracking-tight">{s.driver_name}</p>
                  <p className="text-[10px] sm:text-xs text-red-500 font-bold leading-tight mt-1 px-1 py-0.5 border border-red-100 inline-block rounded">
                    {getIssueSummary(s, ItemStatus.DEFECTIVE)}
                  </p>
                </div>
                <button onClick={() => handleResolveIssue(s.id, 'MANUTENCAO')} className="w-full sm:w-auto bg-[#0A2540] text-white text-[10px] font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl hover:bg-[#1E90FF] transition-all uppercase tracking-widest active:scale-95">Validar Vistoria</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(user.role === 'ADMIN' || user.role === 'OPERACAO') && operationBacklog.length > 0 && (
        <div className="bg-orange-50/30 border border-orange-100 rounded-[2rem] sm:rounded-[3rem] overflow-hidden">
          <div className="px-6 sm:px-10 py-4 sm:py-6 bg-[#0A2540] text-white flex justify-between items-center">
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Aguardando visto da Operação</h3>
            <span className="bg-orange-500 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black">{operationBacklog.length}</span>
          </div>
          <div className="p-4 sm:p-8 space-y-4 sm:space-y-5">
            {operationBacklog.map(s => (
              <div key={s.id} className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-orange-100 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 group transition-all">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white border-2 border-orange-500 rounded-xl flex items-center justify-center text-center p-2 shrink-0">
                   <span className="font-black text-orange-600 text-lg sm:text-xl leading-none">{s.prefix}</span>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <p className="text-base sm:text-lg font-black text-[#0A2540] uppercase tracking-tight">{s.driver_name}</p>
                  <p className="text-[10px] sm:text-xs text-orange-600 font-bold leading-tight mt-1 px-1 py-0.5 border border-orange-100 inline-block rounded">
                    {getIssueSummary(s, ItemStatus.MISSING)}
                  </p>
                </div>
                <button onClick={() => handleResolveIssue(s.id, 'OPERACAO')} className="w-full sm:w-auto bg-[#0A2540] text-white text-[10px] font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl hover:bg-[#1E90FF] transition-all uppercase tracking-widest active:scale-95">Validar Operação</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


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
    return Object.entries(entry.items)
      .filter(([id, data]: [string, any]) => data.status === filterStatus)
      .map(([id, _]) => {
        const dbItem = availableItems.find(i => i.id.toString() === id);
        if (dbItem) return dbItem.label;
        const item = OFFICIAL_SOLURB_ITEMS.find(i => i.id.toString() === id);
        return item ? item.label : `Item ${id}`;
      })
      .slice(0, 3).join(', ') + (Object.entries(entry.items).filter(([_, d]: [string, any]) => d.status === filterStatus).length > 3 ? '...' : '');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="w-3 h-8 bg-emerald-600 rounded-full"></div>
             Visão Operacional
          </h2>
          <p className="text-slate-400 text-sm font-medium">Status da frota em {dashboardDate}</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl">
          <label className="text-[10px] font-black uppercase text-slate-400 px-2">Data:</label>
          <input type="date" value={dashboardDate} onChange={e => setDashboardDate(e.target.value)} className="bg-transparent font-bold text-sm text-slate-700 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div onClick={onNewChecklist} className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-100 cursor-pointer hover:bg-emerald-700 transition-all flex items-center justify-between group">
          <div className="relative z-10">
            <h2 className="text-2xl font-black tracking-tight">Nova Vistoria</h2>
            <p className="opacity-80 font-medium text-sm">Iniciar checklist do veículo</p>
          </div>
          <div className="bg-white/20 p-5 rounded-3xl group-hover:scale-110 transition-transform">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Total de Vistorias</h2>
            <p className="text-5xl font-black text-slate-800 tracking-tighter">{displayCount}</p>
            <button onClick={onViewHistory} className="mt-4 text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">Ver Histórico completo</button>
          </div>
        </div>
      </div>

      {(user.role === 'ADMIN' || user.role === 'MANUTENCAO') && maintenanceBacklog.length > 0 && (
        <div className="bg-red-50/50 border border-red-100 rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="px-8 py-5 bg-red-600 text-white flex justify-between items-center"><h3 className="font-black uppercase tracking-widest text-sm">Vistos de Manutenção (Defeitos)</h3></div>
          <div className="p-6 space-y-4">
            {maintenanceBacklog.map(s => (
              <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl">{s.prefix}</div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-800 mb-1">Veículo: {s.prefix} - {s.driver_name}</p>
                  <p className="text-xs text-red-600 font-bold leading-relaxed">Defeitos: {getIssueSummary(s, ItemStatus.DEFECTIVE) || "Divergência detectada"}</p>
                </div>
                <button onClick={() => handleResolveIssue(s.id, 'MANUTENCAO')} className="w-full sm:w-auto bg-red-600 text-white text-[10px] font-black px-6 py-3 rounded-xl shadow-lg hover:bg-red-700 transition-all">ASSINAR VISTORIA</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(user.role === 'ADMIN' || user.role === 'OPERACAO') && operationBacklog.length > 0 && (
        <div className="bg-orange-50/50 border border-orange-100 rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="px-8 py-5 bg-orange-500 text-white flex justify-between items-center"><h3 className="font-black uppercase tracking-widest text-sm">Vistos de Operação (Faltas)</h3></div>
          <div className="p-6 space-y-4">
            {operationBacklog.map(s => (
              <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center font-black text-xl">{s.prefix}</div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-800 mb-1">Veículo: {s.prefix} - {s.driver_name}</p>
                  <p className="text-xs text-orange-600 font-bold leading-relaxed">Faltas: {getIssueSummary(s, ItemStatus.MISSING)}</p>
                </div>
                <button onClick={() => handleResolveIssue(s.id, 'OPERACAO')} className="w-full sm:w-auto bg-orange-500 text-white text-[10px] font-black px-6 py-3 rounded-xl shadow-lg hover:bg-orange-600 transition-all">ASSINAR VISTORIA</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

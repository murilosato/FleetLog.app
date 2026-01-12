
import React, { useState, useEffect } from 'react';
import { RefuelingEntry, LubricantEntry, MaintenanceSession, MaintenancePause, ServiceOrder, ServiceOrderLog } from '../types';
import { supabase } from '../lib/supabase';

interface RecordsHistoryViewProps {
  onBack: () => void;
  initialTab?: 'refueling' | 'lubricant' | 'maintenance' | 'service_order';
  onOpenMaintenance?: (id: string) => void;
}

const RecordsHistoryView: React.FC<RecordsHistoryViewProps> = ({ 
  onBack, 
  initialTab = 'refueling',
  onOpenMaintenance 
}) => {
  const [tab, setTab] = useState<'refueling' | 'lubricant' | 'maintenance' | 'service_order'>(initialTab);
  const [refuelingHistory, setRefuelingHistory] = useState<RefuelingEntry[]>([]);
  const [lubricantHistory, setLubricantHistory] = useState<LubricantEntry[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceSession[]>([]);
  const [osHistory, setOsHistory] = useState<ServiceOrder[]>([]);
  const [osLogs, setOsLogs] = useState<ServiceOrderLog[]>([]);
  const [expandedOSId, setExpandedOSId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [tab]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'refueling') {
        let res = await supabase.from('refueling_entries').select('*').order('event_at', { ascending: false });
        if (res.error) throw res.error;
        setRefuelingHistory(res.data || []);
      } else if (tab === 'lubricant') {
        let res = await supabase.from('lubricant_entries').select('*').order('event_at', { ascending: false });
        if (res.error) throw res.error;
        setLubricantHistory(res.data || []);
      } else if (tab === 'maintenance') {
        let res = await supabase.from('maintenance_sessions').select('*').order('start_time', { ascending: false });
        if (res.error) throw res.error;
        setMaintenanceHistory(res.data || []);
      } else {
        // Service Order
        const res = await supabase.from('service_orders').select('*, users(name)').order('os_number', { ascending: false });
        if (res.error) throw res.error;
        setOsHistory(res.data || []);
        
        const logRes = await supabase.from('service_order_logs').select('*').order('created_at', { ascending: false });
        if (logRes.data) setOsLogs(logRes.data);
      }
    } catch (err: any) {
      console.error("Erro ao buscar histórico:", err.message);
      setError(`Falha ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return { date: '-', time: '-' };
    const d = new Date(dateStr);
    return { 
      date: d.toLocaleDateString('pt-BR'), 
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="p-3.5 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
            <svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A2540] tracking-tight uppercase">Histórico Operacional</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto shadow-inner overflow-x-auto hide-scrollbar">
          <button onClick={() => setTab('refueling')} className={`flex-1 md:w-28 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'refueling' ? 'bg-[#58CC02] text-white shadow-md' : 'text-slate-400'}`}>Abastec.</button>
          <button onClick={() => setTab('lubricant')} className={`flex-1 md:w-28 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'lubricant' ? 'bg-[#FFA500] text-white shadow-md' : 'text-slate-400'}`}>Lubrif.</button>
          <button onClick={() => setTab('service_order')} className={`flex-1 md:w-28 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'service_order' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400'}`}>O.S. Frota</button>
          <button onClick={() => setTab('maintenance')} className={`flex-1 md:w-28 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'maintenance' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}>Oficina</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Carregando dados...</div>
        ) : tab === 'service_order' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nº O.S.</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Prefixo</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">KM</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">HOR</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {osHistory.length > 0 ? osHistory.map(os => {
                   const isExpanded = expandedOSId === os.id;
                   const logs = osLogs.filter(l => l.os_id === os.id);
                   return (
                     <React.Fragment key={os.id}>
                        <tr className={`hover:bg-slate-50/40 cursor-pointer ${isExpanded ? 'bg-slate-50/80' : ''}`} onClick={() => setExpandedOSId(isExpanded ? null : os.id)}>
                          <td className="px-6 py-4 font-tech font-bold text-red-600 text-sm">#{os.os_number}</td>
                          <td className="px-6 py-4 font-black text-[#0A2540]">{os.prefix}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700 text-xs">{os.km}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700 text-xs">{os.horimetro}</td>
                          <td className="px-6 py-4">
                             <span className="text-[8px] font-black px-2 py-1 rounded-lg uppercase bg-red-50 text-red-600 border border-red-100">Aberta</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <svg className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={6} className="px-10 py-8">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                  <div className="space-y-4">
                                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Motivo / Descrição Original</h5>
                                     <p className="text-sm font-bold text-slate-700 leading-relaxed bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">"{os.description}"</p>
                                  </div>
                                  <div className="space-y-4">
                                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Logs de Rastreabilidade</h5>
                                     <div className="space-y-3">
                                        {logs.map(log => (
                                          <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                             <div className="space-y-1">
                                                <p className="text-[11px] font-black text-[#0A2540] uppercase">{log.action_description}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Por: {log.user_name} em {new Date(log.created_at).toLocaleString()}</p>
                                             </div>
                                             <div className="text-right">
                                                <p className="text-[10px] font-black text-red-600 font-tech">{log.km} KM</p>
                                                <p className="text-[10px] font-black text-red-600 font-tech">{log.horimetro} H</p>
                                             </div>
                                          </div>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                            </td>
                          </tr>
                        )}
                     </React.Fragment>
                   )
                }) : (
                  <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Nenhuma O.S. encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400">Funcionalidade em desenvolvimento para esta aba específica.</div>
        )}
      </div>
    </div>
  );
};

export default RecordsHistoryView;

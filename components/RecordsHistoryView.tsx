
import React, { useState, useEffect } from 'react';
import { RefuelingEntry, LubricantEntry, MaintenanceSession, ServiceOrder, ServiceOrderLog } from '../types';
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
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [refuelingHistory, setRefuelingHistory] = useState<any[]>([]);
  const [lubricantHistory, setLubricantHistory] = useState<any[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [osHistory, setOsHistory] = useState<ServiceOrder[]>([]);
  const [osLogs, setOsLogs] = useState<ServiceOrderLog[]>([]);
  const [expandedOSId, setExpandedOSId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [tab, startDate, endDate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const start = `${startDate}T00:00:00`;
      const end = `${endDate}T23:59:59`;

      if (tab === 'refueling') {
        const { data } = await supabase.from('refueling_entries').select('*, fuel_types(name), users(name)')
          .gte('event_at', start).lte('event_at', end).order('event_at', { ascending: false });
        setRefuelingHistory(data || []);
      } else if (tab === 'lubricant') {
        const { data } = await supabase.from('lubricant_entries').select('*, lubricant_types(name), users(name)')
          .gte('event_at', start).lte('event_at', end).order('event_at', { ascending: false });
        setLubricantHistory(data || []);
      } else if (tab === 'maintenance') {
        const { data } = await supabase.from('maintenance_sessions').select('*, users(name)')
          .gte('start_time', start).lte('start_time', end).order('start_time', { ascending: false });
        setMaintenanceHistory(data || []);
      } else {
        const { data } = await supabase.from('service_orders').select('*, users(name)')
          .gte('created_at', start).lte('created_at', end).order('os_number', { ascending: false });
        setOsHistory(data || []);
        const logRes = await supabase.from('service_order_logs').select('*').order('created_at', { ascending: false });
        if (logRes.data) setOsLogs(logRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20">
      {/* HEADER E FILTROS */}
      <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button onClick={onBack} className="p-3.5 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
              <svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0A2540] tracking-tight uppercase">Histórico Operacional</h2>
          </div>
          
          <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100 items-center gap-4">
            <div className="flex items-center gap-2 px-3">
              <span className="text-[9px] font-black text-slate-400 uppercase">De:</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-0 font-bold text-xs outline-none" />
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-2 px-3">
              <span className="text-[9px] font-black text-slate-400 uppercase">Até:</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-0 font-bold text-xs outline-none" />
            </div>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full shadow-inner overflow-x-auto hide-scrollbar gap-1">
          <button onClick={() => setTab('refueling')} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'refueling' ? 'bg-[#58CC02] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Abastec.</button>
          <button onClick={() => setTab('lubricant')} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'lubricant' ? 'bg-[#FFA500] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Lubrif.</button>
          <button onClick={() => setTab('service_order')} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'service_order' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>O.S. Frota</button>
          <button onClick={() => setTab('maintenance')} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'maintenance' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Oficina</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
             <div className="w-10 h-10 border-4 border-slate-100 border-t-[#0A2540] rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Consultando Registros...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'refueling' && (
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Data/Hora</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Veículo</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">KM/HOR</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Combustível</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Qtd (L)</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">ARLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {refuelingHistory.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-[#0A2540]">{new Date(r.event_at).toLocaleDateString()}</p>
                        <p className="text-[9px] text-slate-400">{new Date(r.event_at).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-[#0A2540]">{r.prefix}</td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-bold text-slate-600">{r.km} KM</p>
                        <p className="text-[10px] font-bold text-slate-400">{r.horimetro} H</p>
                      </td>
                      <td className="px-6 py-4"><span className="text-[10px] font-black bg-green-50 text-[#58CC02] px-2 py-1 rounded-lg uppercase">{r.fuel_types?.name || 'Diesel'}</span></td>
                      <td className="px-6 py-4 text-right font-black text-[#0A2540]">{r.quantity} L</td>
                      <td className="px-6 py-4 text-right font-black text-blue-500">{r.arla_quantity || 0} L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'lubricant' && (
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Data/Hora</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Veículo</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">KM/HOR</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Insumo</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Qtd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lubricantHistory.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold">{new Date(l.event_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-black text-[#0A2540]">{l.prefix}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{l.km} KM</td>
                      <td className="px-6 py-4"><span className="text-[10px] font-black bg-orange-50 text-[#FFA500] px-2 py-1 rounded-lg uppercase">{l.lubricant_types?.name || 'Óleo'}</span></td>
                      <td className="px-6 py-4 text-right font-black text-[#0A2540]">{l.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'maintenance' && (
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Início</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Fim</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Veículo</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mecânico</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">T. Efetivo</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {maintenanceHistory.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-[10px] font-bold">{new Date(m.start_time).toLocaleString()}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{m.end_time ? new Date(m.end_time).toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 font-black text-[#0A2540]">{m.prefix}</td>
                      <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">{m.users?.name || '-'}</td>
                      <td className="px-6 py-4 text-right font-tech font-bold text-[#0A2540]">{m.total_effective_seconds ? formatDuration(m.total_effective_seconds) : 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${m.status === 'FINISHED' ? 'bg-green-50 text-[#58CC02]' : 'bg-red-50 text-red-600'}`}>
                          {m.status === 'FINISHED' ? 'Finalizado' : 'Em Curso'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'service_order' && (
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
                  {osHistory.map(os => {
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
                             <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${os.status === 'OPEN' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{os.status === 'OPEN' ? 'Aberta' : 'Fechada'}</span>
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
                                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Motivo Original</h5>
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
                                          </div>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
            
            {((tab === 'refueling' && refuelingHistory.length === 0) || 
               (tab === 'lubricant' && lubricantHistory.length === 0) || 
               (tab === 'maintenance' && maintenanceHistory.length === 0) || 
               (tab === 'service_order' && osHistory.length === 0)) && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                 <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                 <p className="text-[10px] font-black uppercase tracking-widest">Nenhum dado encontrado para o período selecionado.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsHistoryView;

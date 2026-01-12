
import React, { useState, useEffect } from 'react';
import { RefuelingEntry, LubricantEntry, MaintenanceSession, ServiceOrder, ServiceOrderLog, MaintenancePause } from '../types';
import { supabase } from '../lib/supabase';

interface RecordsHistoryViewProps {
  onBack: () => void;
  initialTab?: 'refueling' | 'lubricant' | 'maintenance' | 'service_order';
}

const RecordsHistoryView: React.FC<RecordsHistoryViewProps> = ({ onBack, initialTab = 'refueling' }) => {
  const [tab, setTab] = useState(initialTab);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any[]>([]);
  const [pauses, setPauses] = useState<Record<string, MaintenancePause[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        setData(data || []);
      } else if (tab === 'lubricant') {
        const { data } = await supabase.from('lubricant_entries').select('*, lubricant_types(name), users(name)')
          .gte('event_at', start).lte('event_at', end).order('event_at', { ascending: false });
        setData(data || []);
      } else if (tab === 'maintenance') {
        const { data } = await supabase.from('maintenance_sessions').select('*, users(name)').gte('start_time', start).lte('start_time', end).order('start_time', { ascending: false });
        setData(data || []);
        
        const sessionIds = (data || []).map(s => s.id);
        if (sessionIds.length > 0) {
          const { data: pauseList } = await supabase.from('maintenance_pauses').select('*').in('session_id', sessionIds);
          const grouped: Record<string, MaintenancePause[]> = {};
          pauseList?.forEach(p => {
            if (!grouped[p.session_id]) grouped[p.session_id] = [];
            grouped[p.session_id].push(p);
          });
          setPauses(grouped);
        }
      } else if (tab === 'service_order') {
        const { data } = await supabase.from('service_orders').select('*, users(name)').gte('created_at', start).lte('created_at', end).order('os_number', { ascending: false });
        setData(data || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const formatDur = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}h ${m}m`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Histórico Detalhado */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 shadow-sm">
            <svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2 className="text-2xl font-black text-[#0A2540] uppercase">Histórico Detalhado</h2>
        </div>
        <div className="flex bg-[#0A2540]/5 p-1.5 rounded-2xl gap-1 overflow-x-auto hide-scrollbar">
          {['refueling', 'lubricant', 'service_order', 'maintenance'].map(t => (
            <button 
              key={t} 
              onClick={() => { setTab(t as any); setExpandedId(null); }} 
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${tab === t ? 'bg-[#0A2540] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'refueling' ? 'Abastec.' : t === 'lubricant' ? 'Lubrif.' : t === 'service_order' ? 'O.S. Frota' : 'Oficina'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {/* Filtros de Data */}
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-6 items-center">
           <div className="flex bg-white border border-slate-200 rounded-2xl p-1 gap-4 items-center pr-4">
             <div className="flex items-center gap-2 pl-4">
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="font-black text-sm text-[#0A2540] outline-none py-2" />
               <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round"/></svg>
             </div>
             <div className="w-px h-8 bg-slate-100"></div>
             <div className="flex items-center gap-2">
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="font-black text-sm text-[#0A2540] outline-none py-2" />
               <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round"/></svg>
             </div>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Registros...</div>
          ) : data.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Nenhum dado encontrado no período</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-7">Data / Hora</th>
                  <th className="px-8 py-7">Veículo</th>
                  <th className="px-8 py-7">Responsável</th>
                  <th className="px-8 py-7 text-right">Dados Principais</th>
                  <th className="px-8 py-7 text-center">Status/Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(item => {
                  const isMaintenance = tab === 'maintenance';
                  const isExpanded = expandedId === item.id;
                  
                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : ''}`} onClick={() => isMaintenance && setExpandedId(isExpanded ? null : item.id)}>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-[#0A2540] leading-none mb-1">{new Date(item.start_time || item.event_at || item.created_at).toLocaleDateString()}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">{new Date(item.start_time || item.event_at || item.created_at).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-8 py-5 font-black text-[#0A2540] text-lg uppercase leading-none">{item.prefix}</td>
                        <td className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase leading-none">{item.users?.name || '-'}</td>
                        <td className="px-8 py-5 text-right">
                          {tab === 'maintenance' && <p className="font-tech font-bold text-[#0A2540]">{item.total_effective_seconds ? formatDur(item.total_effective_seconds) : 'EM CURSO'}</p>}
                          {tab === 'refueling' && (
                            <div className="leading-tight">
                               <p className="font-tech font-black text-2xl text-[#58CC02]">{item.quantity}L <span className="text-[10px] text-slate-300 font-rajdhani">({item.fuel_types?.name})</span></p>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ARLA: {item.arla_quantity || 0}L</p>
                            </div>
                          )}
                          {tab === 'lubricant' && (
                             <div className="leading-tight">
                               <p className="font-tech font-black text-2xl text-[#FFA500]">{item.quantity} <span className="text-[10px] text-slate-300 font-rajdhani">({item.lubricant_types?.name})</span></p>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.km} KM</p>
                             </div>
                          )}
                          {tab === 'service_order' && (
                             <div className="leading-tight">
                               <p className="font-tech font-bold text-red-600">O.S. #{item.os_number}</p>
                               <p className="text-[9px] font-bold text-slate-400 truncate max-w-[150px]">{item.description}</p>
                             </div>
                          )}
                        </td>
                        <td className="px-8 py-5 text-center">
                          {isMaintenance ? (
                            <svg className={`w-4 h-4 text-slate-300 mx-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
                          ) : (
                            <span className="text-[8px] font-black bg-slate-50 text-slate-300 px-3 py-1.5 rounded-lg uppercase tracking-widest">Registrado</span>
                          )}
                        </td>
                      </tr>
                      {isMaintenance && isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={5} className="px-12 py-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Diagnóstico / Motivo</h5>
                                   <p className="text-sm font-bold text-slate-700 leading-relaxed bg-white p-6 rounded-3xl border border-slate-100 shadow-sm italic">"{item.opening_reason}"</p>
                                </div>
                                <div className="space-y-4">
                                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Log de Pausas</h5>
                                   <div className="space-y-3">
                                      {pauses[item.id]?.length > 0 ? pauses[item.id].map(p => (
                                        <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                                           <div>
                                              <p className="text-[11px] font-black text-[#0A2540] uppercase">{p.reason}</p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(p.pause_start).toLocaleTimeString()} - {p.pause_end ? new Date(p.pause_end).toLocaleTimeString() : 'Ativa'}</p>
                                           </div>
                                           {p.pause_end && <span className="text-[9px] font-tech font-bold text-slate-400">{formatDur(Math.floor((new Date(p.pause_end).getTime() - new Date(p.pause_start).getTime()) / 1000))}</span>}
                                        </div>
                                      )) : <p className="text-[10px] font-bold text-slate-300 uppercase italic">Nenhuma parada registrada.</p>}
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
        </div>
      </div>
    </div>
  );
};

export default RecordsHistoryView;

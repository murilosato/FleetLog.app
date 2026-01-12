
import React, { useState, useEffect } from 'react';
import { RefuelingEntry, LubricantEntry, MaintenanceSession, ServiceOrder, MaintenancePause } from '../types';
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
        const { data: sessionList } = await supabase.from('maintenance_sessions').select('*, users(name)')
          .gte('start_time', start).lte('start_time', end).order('start_time', { ascending: false });
        setData(sessionList || []);
        
        const sessionIds = (sessionList || []).map(s => s.id);
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

  const calculateTotalPauseSecs = (sessionPauses: MaintenancePause[] | undefined) => {
    if (!sessionPauses) return 0;
    return sessionPauses.reduce((acc, p) => {
      if (p.pause_end) {
        return acc + Math.floor((new Date(p.pause_end).getTime() - new Date(p.pause_start).getTime()) / 1000);
      }
      return acc;
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 sm:p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all shadow-sm">
            <svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2.5"/></svg>
          </button>
          <h2 className="text-2xl font-black text-[#0A2540] uppercase">Histórico Operacional</h2>
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
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-6 items-center">
           <div className="flex items-center gap-2">
             <span className="text-[9px] font-black text-slate-400 uppercase">Início:</span>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="font-bold text-xs bg-white border p-2 rounded-lg outline-none" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-[9px] font-black text-slate-400 uppercase">Fim:</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="font-bold text-xs bg-white border p-2 rounded-lg outline-none" />
           </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest animate-pulse">Sincronizando...</div>
          ) : data.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhum dado encontrado</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-6">Data/Hora</th>
                  <th className="px-6 py-6">Veículo</th>
                  <th className="px-6 py-6">Responsável</th>
                  {tab === 'refueling' && <>
                    <th className="px-6 py-6">Insumo</th>
                    <th className="px-6 py-6 text-right">Qtd (L)</th>
                    <th className="px-6 py-6 text-right">ARLA (L)</th>
                  </>}
                  {tab === 'lubricant' && <>
                    <th className="px-6 py-6">Lubrificante</th>
                    <th className="px-6 py-6 text-right">Quantidade</th>
                    <th className="px-6 py-6 text-right">KM/HOR</th>
                  </>}
                  {tab === 'service_order' && <>
                    <th className="px-6 py-6">Nº O.S.</th>
                    <th className="px-6 py-6">Motivo da Abertura</th>
                    <th className="px-6 py-6 text-center">Status</th>
                  </>}
                  {tab === 'maintenance' && <>
                    <th className="px-6 py-6">Controle</th>
                    <th className="px-6 py-6">Tempo Efetivo</th>
                    <th className="px-6 py-6">Tempo Parada</th>
                    <th className="px-6 py-6 text-center">Ações</th>
                  </>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(item => {
                  const isMaintenance = tab === 'maintenance';
                  const isExpanded = expandedId === item.id;
                  
                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : ''}`} onClick={() => isMaintenance && setExpandedId(isExpanded ? null : item.id)}>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-[#0A2540]">{new Date(item.start_time || item.event_at || item.created_at).toLocaleDateString()}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(item.start_time || item.event_at || item.created_at).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-[#0A2540]">{item.prefix}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">{item.users?.name || '-'}</td>
                        
                        {tab === 'refueling' && <>
                          <td className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">{item.fuel_types?.name}</td>
                          <td className="px-6 py-4 text-right font-tech font-bold text-green-600">{item.quantity}L</td>
                          <td className="px-6 py-4 text-right font-tech font-bold text-blue-500">{item.arla_quantity || 0}L</td>
                        </>}

                        {tab === 'lubricant' && <>
                          <td className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">{item.lubricant_types?.name}</td>
                          <td className="px-6 py-4 text-right font-tech font-bold text-orange-600">{item.quantity}</td>
                          <td className="px-6 py-4 text-right font-tech font-bold text-slate-400">{item.km}/{item.horimetro}</td>
                        </>}

                        {tab === 'service_order' && <>
                          <td className="px-6 py-4 font-tech font-bold text-red-600 text-sm">#{item.os_number}</td>
                          <td className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500 truncate max-w-[200px]">{item.description}</td>
                          <td className="px-6 py-4 text-center">
                             <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${item.status === 'CLOSED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{item.status}</span>
                          </td>
                        </>}

                        {tab === 'maintenance' && <>
                          <td className="px-6 py-4 font-tech font-bold text-slate-600 text-xs">C-{item.id.substring(0, 4).toUpperCase()}</td>
                          <td className="px-6 py-4 font-tech font-bold text-[#0A2540]">{item.total_effective_seconds ? formatDur(item.total_effective_seconds) : 'EM CURSO'}</td>
                          <td className="px-6 py-4 font-tech font-bold text-orange-500">{formatDur(calculateTotalPauseSecs(pauses[item.id]))}</td>
                          <td className="px-6 py-4 text-center">
                            <svg className={`w-4 h-4 text-slate-300 mx-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
                          </td>
                        </>}
                      </tr>
                      {isMaintenance && isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={7} className="px-10 py-6 border-l-4 border-[#0A2540]">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Diagnóstico Inicial</h5>
                                   <p className="text-[12px] font-bold text-slate-700 leading-relaxed bg-white p-4 rounded-xl border italic">"{item.opening_reason}"</p>
                                </div>
                                <div className="space-y-3">
                                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Histórico de Paradas</h5>
                                   <div className="space-y-2">
                                      {pauses[item.id]?.length > 0 ? pauses[item.id].map(p => (
                                        <div key={p.id} className="bg-white p-3 rounded-lg border flex justify-between items-center text-[11px]">
                                           <span className="font-bold text-slate-600 uppercase">{p.reason}</span>
                                           <span className="font-tech text-slate-400">
                                              {p.pause_end ? formatDur(Math.floor((new Date(p.pause_end).getTime() - new Date(p.pause_start).getTime()) / 1000)) : 'Ativa'}
                                           </span>
                                        </div>
                                      )) : <p className="text-[10px] font-bold text-slate-300 uppercase">Nenhuma parada</p>}
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

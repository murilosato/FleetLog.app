
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
        const { data } = await supabase.from('refueling_entries').select('*, fuel_types(name)').gte('event_at', start).lte('event_at', end).order('event_at', { ascending: false });
        setData(data || []);
      } else if (tab === 'maintenance') {
        const { data } = await supabase.from('maintenance_sessions').select('*, users(name)').gte('start_time', start).lte('start_time', end).order('start_time', { ascending: false });
        setData(data || []);
        const { data: pauseList } = await supabase.from('maintenance_pauses').select('*');
        const grouped: Record<string, MaintenancePause[]> = {};
        pauseList?.forEach(p => {
          if (!grouped[p.session_id]) grouped[p.session_id] = [];
          grouped[p.session_id].push(p);
        });
        setPauses(grouped);
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
      <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100"><svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2.5"/></svg></button>
          <h2 className="text-2xl font-black text-[#0A2540] uppercase">Histórico Geral</h2>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          {['refueling', 'service_order', 'maintenance'].map(t => (
            <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${tab === t ? 'bg-[#0A2540] text-white shadow-lg' : 'text-slate-400'}`}>
              {t === 'refueling' ? 'Abastec.' : t === 'service_order' ? 'O.S. Frota' : 'Oficina'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-4 overflow-x-auto">
           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white p-2 rounded-lg font-bold text-xs outline-none border border-slate-200" />
           <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white p-2 rounded-lg font-bold text-xs outline-none border border-slate-200" />
        </div>
        <div className="overflow-x-auto">
          {tab === 'maintenance' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Início</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Veículo</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">T. Efetivo</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map(m => (
                  <React.Fragment key={m.id}>
                    <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                      <td className="px-6 py-4 text-xs font-bold">{new Date(m.start_time).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 font-black text-[#0A2540]">{m.prefix}</td>
                      <td className="px-6 py-4 text-right font-tech font-bold text-[#0A2540]">{m.total_effective_seconds ? formatDur(m.total_effective_seconds) : '-'}</td>
                      <td className="px-6 py-4"><svg className={`w-4 h-4 text-slate-300 transition-transform ${expandedId === m.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg></td>
                    </tr>
                    {expandedId === m.id && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={4} className="px-10 py-6">
                           <div className="space-y-4">
                              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Detalhes de Paradas/Pausas</h5>
                              {pauses[m.id]?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {pauses[m.id].map(p => (
                                    <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                                       <div>
                                          <p className="text-[10px] font-black text-[#0A2540] uppercase">{p.reason}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(p.pause_start).toLocaleTimeString()} - {p.pause_end ? new Date(p.pause_end).toLocaleTimeString() : 'Em curso'}</p>
                                       </div>
                                       {p.pause_end && (
                                         <span className="text-[8px] font-tech font-bold text-slate-500">{formatDur(Math.floor((new Date(p.pause_end).getTime() - new Date(p.pause_start).getTime()) / 1000))}</span>
                                       )}
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-[9px] font-black text-slate-300 uppercase italic">Nenhuma pausa registrada</p>}
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-20 text-center opacity-30 font-black uppercase text-[10px]">Utilize a tabela detalhada de registros</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordsHistoryView;

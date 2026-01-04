
import React, { useState, useEffect } from 'react';
import { RefuelingEntry, LubricantEntry, MaintenanceSession } from '../types';
import { supabase } from '../lib/supabase';

interface RecordsHistoryViewProps {
  onBack: () => void;
  onOpenMaintenance?: (id: string) => void;
}

const RecordsHistoryView: React.FC<RecordsHistoryViewProps> = ({ onBack, onOpenMaintenance }) => {
  const [tab, setTab] = useState<'refueling' | 'lubricant' | 'maintenance'>('refueling');
  const [refuelingHistory, setRefuelingHistory] = useState<RefuelingEntry[]>([]);
  const [lubricantHistory, setLubricantHistory] = useState<LubricantEntry[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [tab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (tab === 'refueling') {
        const { data, error } = await supabase
          .from('refueling_history_view')
          .select('*')
          .order('event_at', { ascending: false });
        if (error) throw error;
        setRefuelingHistory(data || []);
      } else if (tab === 'lubricant') {
        const { data, error } = await supabase
          .from('lubricant_history_view')
          .select('*')
          .order('event_at', { ascending: false });
        if (error) throw error;
        setLubricantHistory(data || []);
      } else {
        // Para manutenção, precisamos buscar também as pausas para calcular tempo real de itens em curso
        const { data: sessions, error } = await supabase
          .from('maintenance_history_view')
          .select('*')
          .order('start_time', { ascending: false });
        if (error) throw error;
        
        setMaintenanceHistory(sessions || []);
      }
    } catch (err: any) {
      console.error("Erro ao buscar histórico:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds && seconds !== 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return { date: '-', time: '-' };
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('pt-BR');
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="p-3.5 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
            <svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A2540] tracking-tight">Histórico de Registros</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto shadow-inner overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setTab('refueling')} 
            className={`flex-1 md:w-32 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'refueling' ? 'bg-[#1E90FF] text-white shadow-md' : 'text-slate-400'}`}
          >Insumos</button>
          <button 
            onClick={() => setTab('lubricant')} 
            className={`flex-1 md:w-32 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'lubricant' ? 'bg-[#1E90FF] text-white shadow-md' : 'text-slate-400'}`}
          >Lubrif.</button>
          <button 
            onClick={() => setTab('maintenance')} 
            className={`flex-1 md:w-32 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'maintenance' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400'}`}
          >Oficina</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Data/Hora</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Prefixo</th>
                {tab === 'maintenance' ? (
                   <>
                     <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Motivo</th>
                     <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Tempo Efetivo</th>
                     <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                     <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Painel</th>
                   </>
                ) : (
                  <>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">KM</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Horímetro</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Tipo</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Quant.</th>
                  </>
                )}
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Carregando dados...</td></tr>
              ) : tab === 'maintenance' ? (
                maintenanceHistory.length > 0 ? maintenanceHistory.map(entry => {
                  const { date, time } = formatDate(entry.start_time);
                  const isInProgress = entry.status === 'ACTIVE' || entry.status === 'PAUSED';
                  
                  // Cálculo de tempo real simplificado para a tabela
                  let displaySeconds = entry.total_effective_seconds;
                  if (isInProgress) {
                    const startTs = new Date(entry.start_time).getTime();
                    // Na tabela, mostramos o tempo bruto decorrido como aproximação caso seja ativo
                    // O valor exato (com pausas) é visto dentro do timer.
                    displaySeconds = Math.floor((now - startTs) / 1000);
                  }

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-500 text-[10px]">{date}</p>
                        <p className="font-medium text-slate-400 text-[9px]">{time}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-[#0A2540] text-sm">{entry.prefix}</td>
                      <td className="px-6 py-4">
                         <p className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]">{entry.opening_reason}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`font-tech font-black text-sm ${isInProgress ? 'text-[#1E90FF] animate-pulse' : 'text-red-600'}`}>
                           {isInProgress ? 'CONTANDO...' : formatDuration(entry.total_effective_seconds)}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase border ${entry.status === 'FINISHED' ? 'bg-slate-50 border-slate-200 text-slate-400' : (entry.status === 'PAUSED' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600')}`}>
                           {entry.status === 'FINISHED' ? 'Finalizado' : (entry.status === 'PAUSED' ? 'Pausado' : 'Em curso')}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isInProgress && onOpenMaintenance && (
                          <button 
                            onClick={() => onOpenMaintenance(entry.id)}
                            className="px-3 py-1.5 bg-[#0A2540] text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-[#1E90FF] transition-all flex items-center justify-center mx-auto"
                          >
                            Entrar
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-400 text-[10px] truncate max-w-[100px]">{entry.user_name}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Sem registros</td></tr>
                )
              ) : tab === 'refueling' ? (
                refuelingHistory.length > 0 ? refuelingHistory.map(entry => {
                  const { date, time } = formatDate(entry.event_at);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-500 text-[10px]">{date}</p>
                        <p className="font-medium text-slate-400 text-[9px]">{time}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-[#0A2540] text-sm">{entry.prefix}</td>
                      <td className="px-6 py-4 text-center font-black text-[#1E90FF] text-[11px]">{entry.km}</td>
                      <td className="px-6 py-4 text-center font-black text-[#1E90FF] text-[11px]">{entry.horimetro}</td>
                      <td className="px-6 py-4">
                        <span className="text-[8px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded-md uppercase border border-green-100">{entry.fuel_name}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-[#0A2540] text-xs">{entry.quantity} L</td>
                      <td className="px-6 py-4 font-bold text-slate-400 text-[10px] truncate max-w-[100px]">{entry.user_name || 'Admin'}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Sem registros</td></tr>
                )
              ) : (
                lubricantHistory.length > 0 ? lubricantHistory.map(entry => {
                  const { date, time } = formatDate(entry.event_at);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-500 text-[10px]">{date}</p>
                        <p className="font-medium text-slate-400 text-[9px]">{time}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-[#0A2540] text-sm">{entry.prefix}</td>
                      <td className="px-6 py-4 text-center font-black text-[#FFA500] text-[11px]">{entry.km}</td>
                      <td className="px-6 py-4 text-center font-black text-[#FFA500] text-[11px]">{entry.horimetro}</td>
                      <td className="px-6 py-4">
                        <span className="text-[8px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md uppercase border border-orange-100">{entry.lubricant_name}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-[#0A2540] text-xs">{entry.quantity} L/Kg</td>
                      <td className="px-6 py-4 font-bold text-slate-400 text-[10px] truncate max-w-[100px]">{entry.user_name || 'Admin'}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Sem registros</td></tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecordsHistoryView;

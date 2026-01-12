
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { DBChecklistItem } from '../types';

interface ReportsViewProps {
  availableItems: DBChecklistItem[];
  onBack: () => void;
}

const ReportsView: React.FC<ReportsViewProps> = ({ availableItems, onBack }) => {
  const [reportType, setReportType] = useState<'checklists' | 'fuels' | 'lubricants' | 'maintenance_sessions' | 'maintenance_pauses' | 'service_order'>('checklists');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csv = "\ufeff" + [headers.join(';'), ...rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `${filename}_${startDate}.csv`; link.click();
  };

  const handleExport = async () => {
    setLoading(true);
    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;
    try {
      if (reportType === 'checklists') {
        const { data } = await supabase.from('checklist_entries').select('*').gte('date', startDate).lte('date', endDate);
        const sortedItems = [...availableItems].sort((a,b) => a.id - b.id);
        const headers = ['Data', 'Veiculo', 'Turno', 'Tipo', 'Motorista', 'KM', 'HOR', 'Tem Falha?', 'Obs Geral'];
        sortedItems.forEach(i => { 
          headers.push(`[${i.id.toString().padStart(2, '0')}] ${i.label}`); 
          headers.push(`[${i.id.toString().padStart(2, '0')}] OBS`); 
        });
        const rows = data?.map(s => {
          const base = [s.date, s.prefix, s.shift, s.type, s.driver_name, s.km, s.horimetro, s.has_issues ? 'SIM' : 'NAO', s.general_observations || ''];
          sortedItems.forEach(i => { 
            const r = s.items?.[i.id] || s.items?.[i.id.toString()]; 
            base.push(r?.status || '-'); base.push(r?.observations || ''); 
          });
          return base;
        });
        downloadCSV('Relatorio_Checklist', headers, rows || []);
      } else if (reportType === 'fuels') {
        const { data } = await supabase.from('refueling_entries').select('*, fuel_types(name), users(name)').gte('event_at', start).lte('event_at', end);
        const headers = ['Data', 'Veículo', 'KM', 'HOR', 'Combustível', 'Qtd (L)', 'ARLA (L)', 'Usuário'];
        const rows = data?.map(r => [new Date(r.event_at).toLocaleString(), r.prefix, r.km, r.horimetro, r.fuel_types?.name, r.quantity, r.arla_quantity || 0, r.users?.name]);
        downloadCSV('Relatorio_Abastecimento', headers, rows || []);
      } else if (reportType === 'lubricants') {
        const { data } = await supabase.from('lubricant_entries').select('*, lubricant_types(name), users(name)').gte('event_at', start).lte('event_at', end);
        const headers = ['Data', 'Veículo', 'KM', 'HOR', 'Insumo', 'Qtd', 'Usuário'];
        const rows = data?.map(l => [new Date(l.event_at).toLocaleString(), l.prefix, l.km, l.horimetro, l.lubricant_types?.name, l.quantity, l.users?.name]);
        downloadCSV('Relatorio_Lubrificantes', headers, rows || []);
      } else if (reportType === 'maintenance_sessions') {
        const { data } = await supabase.from('maintenance_sessions').select('*, users(name)').gte('start_time', start).lte('start_time', end);
        const headers = ['Inicio', 'Fim', 'Veiculo', 'Mecanico', 'Motivo', 'Tempo Efetivo (Segundos)', 'Status'];
        const rows = data?.map(m => [m.start_time, m.end_time || '-', m.prefix, m.users?.name || '-', m.opening_reason, m.total_effective_seconds || 0, m.status]);
        downloadCSV('Relatorio_Oficina_Tempo_Efetivo', headers, rows || []);
      } else if (reportType === 'maintenance_pauses') {
        const { data } = await supabase.from('maintenance_pauses').select('*, maintenance_sessions(prefix)').gte('pause_start', start).lte('pause_start', end);
        const headers = ['Inicio Pausa', 'Fim Pausa', 'Veiculo', 'Motivo da Parada', 'Tempo (Segundos)'];
        const rows = data?.map(p => [p.pause_start, p.pause_end || '-', p.maintenance_sessions?.prefix || '-', p.reason, p.pause_end ? Math.floor((new Date(p.pause_end).getTime() - new Date(p.pause_start).getTime()) / 1000) : 0]);
        downloadCSV('Relatorio_Oficina_Paradas', headers, rows || []);
      } else if (reportType === 'service_order') {
        const { data } = await supabase.from('service_orders').select('*, users(name)').gte('created_at', start).lte('created_at', end);
        const headers = ['Data', 'Nº OS', 'Veiculo', 'Abertura', 'Motivo', 'Status'];
        const rows = data?.map(o => [new Date(o.created_at).toLocaleString(), o.os_number, o.prefix, o.users?.name, o.description, o.status]);
        downloadCSV('Relatorio_OS', headers, rows || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95"><svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2.5"/></svg></button>
            <h2 className="text-2xl font-black text-[#0A2540] uppercase">Central Analítica</h2>
         </div>
         <div className="w-12 h-12 bg-[#00548b] rounded-2xl flex items-center justify-center text-white font-tech text-xs">CSV</div>
      </div>

      <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'checklists', label: 'Checklist', color: '#00548b' },
            { id: 'fuels', label: 'Abastec.', color: '#58CC02' },
            { id: 'lubricants', label: 'Lubrif.', color: '#FFA500' },
            { id: 'maintenance_sessions', label: 'T. Efetivo', color: '#334155' },
            { id: 'maintenance_pauses', label: 'Paradas', color: '#f97316' },
            { id: 'service_order', label: 'O.S.', color: '#DC2626' }
          ].map(t => (
            <button key={t.id} onClick={() => setReportType(t.id as any)} className={`p-5 rounded-2xl border-2 font-black text-[9px] uppercase tracking-widest transition-all ${reportType === t.id ? 'bg-slate-50 border-slate-900 shadow-lg' : 'bg-white border-slate-50 text-slate-400'}`}>
              <div className="w-2 h-2 rounded-full mb-2 mx-auto" style={{ backgroundColor: t.color }}></div>
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Início do Período</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-0 font-black text-sm text-[#0A2540] outline-none" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Fim do Período</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-0 font-black text-sm text-[#0A2540] outline-none" />
           </div>
        </div>

        <button onClick={handleExport} disabled={loading} className="w-full py-7 bg-[#0A2540] text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:bg-[#1E90FF] transition-all active:scale-95 disabled:opacity-50">
           {loading ? 'Preparando Arquivo...' : 'Baixar Relatório em Excel (CSV)'}
        </button>
      </div>
    </div>
  );
};

export default ReportsView;

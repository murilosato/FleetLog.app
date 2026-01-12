
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { DBChecklistItem } from '../types';

interface ReportsViewProps {
  availableItems: DBChecklistItem[];
  onBack: () => void;
}

const ReportsView: React.FC<ReportsViewProps> = ({ availableItems, onBack }) => {
  const [reportType, setReportType] = useState<'checklists' | 'fuels' | 'maintenance_sessions' | 'maintenance_pauses' | 'service_order'>('checklists');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csv = "\ufeff" + [headers.join(';'), ...rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `${filename}.csv`; link.click();
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
        sortedItems.forEach(i => { headers.push(`[${i.id.toString().padStart(2, '0')}] ${i.label}`); headers.push(`[${i.id.toString().padStart(2, '0')}] Obs`); });
        const rows = data?.map(s => {
          const base = [s.date, s.prefix, s.shift, s.type, s.driver_name, s.km, s.horimetro, s.has_issues ? 'SIM' : 'NAO', s.general_observations || ''];
          sortedItems.forEach(i => { const r = s.items?.[i.id] || s.items?.[i.id.toString()]; base.push(r?.status || '-'); base.push(r?.observations || ''); });
          return base;
        });
        downloadCSV('Relatorio_Checklist', headers, rows || []);
      } else if (reportType === 'maintenance_sessions') {
        const { data } = await supabase.from('maintenance_sessions').select('*, users(name)').gte('start_time', start).lte('start_time', end);
        const headers = ['Inicio', 'Fim', 'Veiculo', 'Mecanico', 'Motivo', 'Tempo Efetivo (Segundos)', 'Status'];
        const rows = data?.map(m => [m.start_time, m.end_time || '-', m.prefix, m.users?.name || '-', m.opening_reason, m.total_effective_seconds || 0, m.status]);
        downloadCSV('Relatorio_Oficina_Sessoes', headers, rows || []);
      } else if (reportType === 'maintenance_pauses') {
        const { data } = await supabase.from('maintenance_pauses').select('*, maintenance_sessions(prefix)').gte('pause_start', start).lte('pause_start', end);
        const headers = ['Inicio Pausa', 'Fim Pausa', 'Veiculo', 'Motivo da Parada', 'Tempo (Segundos)'];
        const rows = data?.map(p => [p.pause_start, p.pause_end || '-', p.maintenance_sessions?.prefix || '-', p.reason, p.pause_end ? Math.floor((new Date(p.pause_end).getTime() - new Date(p.pause_start).getTime()) / 1000) : 0]);
        downloadCSV('Relatorio_Oficina_Paradas', headers, rows || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-10">
        <h2 className="text-2xl font-black text-[#0A2540] uppercase">Relatórios Analíticos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'checklists', label: 'Vistoria' },
            { id: 'maintenance_sessions', label: 'T. Efetivo' },
            { id: 'maintenance_pauses', label: 'Paradas/Pausas' },
            { id: 'service_order', label: 'O.S. Frota' }
          ].map(t => (
            <button key={t.id} onClick={() => setReportType(t.id as any)} className={`p-4 rounded-2xl border-2 font-black text-[9px] uppercase tracking-widest transition-all ${reportType === t.id ? 'bg-[#0A2540] text-white' : 'bg-slate-50 border-transparent text-slate-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-5 bg-slate-50 rounded-2xl border-0 font-black text-sm text-[#0A2540] outline-none" />
           <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-5 bg-slate-50 rounded-2xl border-0 font-black text-sm text-[#0A2540] outline-none" />
        </div>
        <button onClick={handleExport} disabled={loading} className="w-full py-6 bg-[#00548b] text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl disabled:opacity-50">
           {loading ? 'Processando...' : 'Exportar Relatório CSV'}
        </button>
      </div>
    </div>
  );
};

export default ReportsView;

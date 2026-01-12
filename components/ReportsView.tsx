
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { DBChecklistItem } from '../types';

interface ReportsViewProps {
  availableItems: DBChecklistItem[];
  onBack: () => void;
}

const ReportsView: React.FC<ReportsViewProps> = ({ availableItems, onBack }) => {
  const [reportType, setReportType] = useState<'checklists' | 'fuels' | 'lubricants' | 'maintenance' | 'service_order'>('checklists');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const showNoDataAlert = () => {
    setNoDataMessage("Nenhum registro encontrado para o período selecionado.");
    setTimeout(() => setNoDataMessage(null), 5000);
  };

  const exportServiceOrders = async () => {
    const { data } = await supabase.from('service_order_logs').select('*, service_orders(*)')
      .gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`);
    if (!data?.length) return showNoDataAlert();

    const headers = ['Data Log', 'Nº O.S.', 'Veículo', 'Ação', 'KM', 'HOR', 'Usuário'];
    const rows = data.map(log => [new Date(log.created_at).toLocaleString(), log.os_number, log.vehicle_prefix, log.action_description, log.km, log.horimetro, log.user_name]);
    downloadCSV('Relatorio_OS', headers, rows);
  };

  const exportFuels = async () => {
    const { data } = await supabase.from('refueling_entries').select('*, fuel_types(name), users(name)')
      .gte('event_at', `${startDate}T00:00:00`).lte('event_at', `${endDate}T23:59:59`);
    if (!data?.length) return showNoDataAlert();

    const headers = ['Data', 'Veículo', 'KM', 'HOR', 'Combustível', 'Qtd (L)', 'ARLA (L)', 'Usuário'];
    const rows = data.map(r => [new Date(r.event_at).toLocaleString(), r.prefix, r.km, r.horimetro, r.fuel_types?.name || 'Diesel', r.quantity, r.arla_quantity || 0, r.users?.name || '-']);
    downloadCSV('Relatorio_Abastecimento', headers, rows);
  };

  const exportLubricants = async () => {
    const { data } = await supabase.from('lubricant_entries').select('*, lubricant_types(name), users(name)')
      .gte('event_at', `${startDate}T00:00:00`).lte('event_at', `${endDate}T23:59:59`);
    if (!data?.length) return showNoDataAlert();

    const headers = ['Data', 'Veículo', 'KM', 'HOR', 'Insumo', 'Quantidade', 'Usuário'];
    const rows = data.map(l => [new Date(l.event_at).toLocaleString(), l.prefix, l.km, l.horimetro, l.lubricant_types?.name || '-', l.quantity, l.users?.name || '-']);
    downloadCSV('Relatorio_Lubrificantes', headers, rows);
  };

  const exportMaintenance = async () => {
    const { data } = await supabase.from('maintenance_sessions').select('*, users(name)')
      .gte('start_time', `${startDate}T00:00:00`).lte('start_time', `${endDate}T23:59:59`);
    if (!data?.length) return showNoDataAlert();

    const headers = ['Início', 'Fim', 'Veículo', 'Mecânico', 'Motivo', 'Tempo Efetivo (Segundos)', 'Status'];
    const rows = data.map(m => [new Date(m.start_time).toLocaleString(), m.end_time ? new Date(m.end_time).toLocaleString() : '-', m.prefix, m.users?.name || '-', m.opening_reason, m.total_effective_seconds || 0, m.status]);
    downloadCSV('Relatorio_Oficina', headers, rows);
  };

  const exportChecklists = async () => {
    const { data } = await supabase.from('checklist_entries').select('*').gte('date', startDate).lte('date', endDate);
    if (!data?.length) return showNoDataAlert();

    const baseHeaders = ['Data', 'Prefixo', 'Tipo', 'Turno', 'Motorista', 'KM', 'HOR', 'Problemas?', 'Obs'];
    const itemsToExport = [...availableItems].sort((a,b) => a.id - b.id);
    const headers = [...baseHeaders, ...itemsToExport.map(i => i.label)];
    
    const rows = data.map(s => {
      const base = [formatDateDisplay(s.date), s.prefix, s.type, s.shift, s.driver_name, s.km, s.horimetro, s.has_issues ? 'SIM' : 'NÃO', s.general_observations || ''];
      const items = itemsToExport.map(item => s.items?.[item.id]?.status || 'N/A');
      return [...base, ...items];
    });
    downloadCSV('Relatorio_Checklist', headers, rows);
  };

  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const separator = ';';
    const csvContent = "\ufeff" + [headers.join(separator), ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(separator))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${startDate}_${endDate}.csv`;
    link.click();
  };

  const handleExport = async () => {
    setLoading(true);
    if (reportType === 'checklists') await exportChecklists();
    else if (reportType === 'service_order') await exportServiceOrders();
    else if (reportType === 'fuels') await exportFuels();
    else if (reportType === 'lubricants') await exportLubricants();
    else if (reportType === 'maintenance') await exportMaintenance();
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <button onClick={onBack} className="p-3 bg-white shadow-sm border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
          <svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <h2 className="text-2xl font-black text-[#0A2540] tracking-tight uppercase">Inteligência Operacional</h2>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-10">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulo Analítico</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { id: 'checklists', label: 'Vistoria', color: '#0A2540' },
              { id: 'fuels', label: 'Abastec.', color: '#58CC02' },
              { id: 'lubricants', label: 'Lubrif.', color: '#FFA500' },
              { id: 'maintenance', label: 'Oficina', color: '#334155' },
              { id: 'service_order', label: 'O.S.', color: '#DC2626' }
            ].map(type => (
              <button 
                key={type.id} 
                onClick={() => setReportType(type.id as any)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${reportType === type.id ? 'bg-slate-50 border-slate-900 shadow-lg scale-105' : 'border-slate-50 grayscale opacity-60'}`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                <p className="font-black text-[9px] text-[#0A2540] uppercase">{type.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">Início do Período</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-50 font-black text-sm text-[#0A2540] outline-none focus:border-slate-200" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">Fim do Período</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-50 font-black text-sm text-[#0A2540] outline-none focus:border-slate-200" />
          </div>
        </div>

        {noDataMessage && <div className="bg-orange-50 p-5 rounded-2xl text-xs font-bold text-orange-600 text-center animate-bounce">{noDataMessage}</div>}

        <button onClick={handleExport} disabled={loading} className="w-full py-6 bg-[#0A2540] text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-[#1E90FF] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4">
          {loading ? 'Extraindo Dados...' : 'Gerar Relatório CSV'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>
    </div>
  );
};

export default ReportsView;

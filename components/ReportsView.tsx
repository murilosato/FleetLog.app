
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

  const showNoDataAlert = (msg?: string) => {
    setNoDataMessage(msg || "Nenhum registro encontrado para o período e tipo selecionado.");
    setTimeout(() => setNoDataMessage(null), 5000);
  };

  const exportServiceOrders = async () => {
    setLoading(true);
    setNoDataMessage(null);
    try {
      // Unimos a O.S com o Log para relatório detalhado
      const { data, error } = await supabase
        .from('service_order_logs')
        .select('*, service_orders(*)')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        showNoDataAlert();
        return;
      }

      const headers = ['Data/Hora Log', 'Nº O.S.', 'Veículo', 'Ação Realizada', 'KM Informado', 'Horímetro Informado', 'Usuário Responsável', 'Motivo Original'];
      const rows = data.map((log: any) => [
        new Date(log.created_at).toLocaleString('pt-BR'),
        `#${log.os_number}`,
        log.vehicle_prefix,
        log.action_description,
        log.km.toString(),
        log.horimetro.toString(),
        log.user_name,
        log.service_orders?.description?.replace(/(\r\n|\n|\r|")/gm, " ") || 'N/A'
      ]);

      downloadCSV(`Relatorio_OS_Log_${startDate}_${endDate}`, headers, rows);
    } catch (err: any) {
      alert("Erro na exportação de O.S: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportChecklists = async () => {
    setLoading(true);
    setNoDataMessage(null);
    try {
      const { data, error } = await supabase
        .from('checklist_entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        showNoDataAlert();
        return;
      }

      const baseHeaders = ['Data', 'Prefixo', 'Tipo', 'Turno', 'Motorista', 'KM', 'Horimetro', 'Problemas?', 'Obs'];
      const itemsToExport = [...availableItems].sort((a,b) => a.id - b.id);
      const headers = [...baseHeaders, ...itemsToExport.map(i => `[${i.id}] ${i.label}`)];
      
      const rows = data.map((s: any) => {
        const base = [formatDateDisplay(s.date), s.prefix, s.type, s.shift, s.driver_name, s.km, s.horimetro, s.has_issues ? 'SIM' : 'NÃO', (s.general_observations || '').replace(/(\r\n|\n|\r|")/gm, " ")];
        const items = itemsToExport.map(item => {
          const r = s.items ? (s.items[item.id.toString()] || s.items[item.id]) : null;
          return r ? r.status : 'N/A';
        });
        return [...base, ...items];
      });

      downloadCSV(`Relatorio_Checklist_${startDate}_${endDate}`, headers, rows);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const separator = ';';
    const csvContent = [
      headers.join(separator),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(separator))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (reportType === 'checklists') exportChecklists();
    else if (reportType === 'service_order') exportServiceOrders();
    else alert("Exportação para este tipo em desenvolvimento.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <button onClick={onBack} className="p-3 bg-white shadow-sm border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
          <svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <h2 className="text-2xl font-black text-[#0A2540] tracking-tight">Exportação de Relatórios</h2>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-10">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Selecione o Tipo de Dados</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => setReportType('checklists')} className={`p-4 rounded-2xl border-2 transition-all ${reportType === 'checklists' ? 'border-[#1E90FF] bg-blue-50/30' : 'border-slate-50'}`}>
              <p className="font-black text-[9px] text-[#0A2540] uppercase">Checklists</p>
            </button>
            <button onClick={() => setReportType('service_order')} className={`p-4 rounded-2xl border-2 transition-all ${reportType === 'service_order' ? 'border-red-600 bg-red-50/30' : 'border-slate-50'}`}>
              <p className="font-black text-[9px] text-[#0A2540] uppercase">Ordem Serviço</p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">De:</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 font-black text-sm text-[#0A2540]" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">Até:</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 font-black text-sm text-[#0A2540]" />
          </div>
        </div>

        {noDataMessage && <div className="bg-orange-50 p-4 rounded-2xl text-xs font-bold text-orange-600 text-center">{noDataMessage}</div>}

        <button onClick={handleExport} disabled={loading} className="w-full py-5 bg-[#0A2540] text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-[#1E90FF] transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Processando...' : 'Baixar CSV'}
        </button>
      </div>
    </div>
  );
};

export default ReportsView;

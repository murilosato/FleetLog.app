
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { DBChecklistItem } from '../types';

interface ReportsViewProps {
  availableItems: DBChecklistItem[];
  onBack: () => void;
}

const ReportsView: React.FC<ReportsViewProps> = ({ availableItems, onBack }) => {
  const [reportType, setReportType] = useState<'checklists' | 'fuels' | 'lubricants' | 'maintenance'>('checklists');
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
    setNoDataMessage("Nenhum registro encontrado para o período e tipo selecionado.");
    setTimeout(() => setNoDataMessage(null), 5000);
  };

  const exportChecklists = async () => {
    setLoading(true);
    setNoDataMessage(null);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        showNoDataAlert();
        return;
      }

      const baseHeaders = ['Data', 'Prefixo', 'Tipo', 'Turno', 'Motorista', 'KM', 'Horimetro', 'Problemas?', 'Observações Gerais'];
      const itemsToExport = [...availableItems].sort((a,b) => a.id - b.id);
      
      const itemHeaders: string[] = [];
      itemsToExport.forEach(item => {
        const label = item.label.replace(/^\d+\.\s*/, '');
        itemHeaders.push(`[${item.id}] ${label} (Status)`);
        itemHeaders.push(`[${item.id}] ${label} (Obs)`);
      });

      const headers = [...baseHeaders, ...itemHeaders];
      const rows = data.map((s: any) => {
        const baseData = [
          formatDateDisplay(s.date),
          s.prefix,
          s.type,
          s.shift,
          s.driver_name,
          s.km.toString(),
          s.horimetro.toString(),
          s.has_issues ? 'SIM' : 'NÃO',
          (s.general_observations || '').replace(/(\r\n|\n|\r|")/gm, " ")
        ];

        const itemData: string[] = [];
        itemsToExport.forEach(item => {
          const sItem = s.items ? (s.items[item.id.toString()] || s.items[item.id]) : null;
          if (sItem) {
            itemData.push(sItem.status || 'OK');
            itemData.push((sItem.observations || '').replace(/(\r\n|\n|\r|")/gm, " "));
          } else {
            itemData.push('N/A');
            itemData.push('');
          }
        });

        return [...baseData, ...itemData];
      });

      downloadCSV(`Relatorio_Checklist_${startDate}_${endDate}`, headers, rows);
    } catch (err: any) {
      alert("Erro ao exportar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportFuels = async () => {
    setLoading(true);
    setNoDataMessage(null);
    try {
      const { data, error } = await supabase
        .from('refueling_history_view')
        .select('*')
        .gte('event_at', `${startDate}T00:00:00`)
        .lte('event_at', `${endDate}T23:59:59`)
        .order('event_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        showNoDataAlert();
        return;
      }

      const headers = ['Data/Hora', 'Prefixo', 'KM', 'Horimetro', 'Combustível', 'Quantidade (L)', 'ARLA 32 (L)', 'Usuário'];
      const rows = data.map((d: any) => [
        new Date(d.event_at).toLocaleString('pt-BR'),
        d.prefix,
        d.km.toString(),
        d.horimetro.toString(),
        d.fuel_name,
        d.quantity.toString(),
        (d.arla_quantity || 0).toString(),
        d.user_name || 'Admin'
      ]);

      downloadCSV(`Relatorio_Abastecimento_${startDate}_${endDate}`, headers, rows);
    } catch (err: any) {
      alert("Erro ao exportar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportLubricants = async () => {
    setLoading(true);
    setNoDataMessage(null);
    try {
      const { data, error } = await supabase
        .from('lubricant_history_view')
        .select('*')
        .gte('event_at', `${startDate}T00:00:00`)
        .lte('event_at', `${endDate}T23:59:59`)
        .order('event_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        showNoDataAlert();
        return;
      }

      const headers = ['Data/Hora', 'Prefixo', 'KM', 'Horimetro', 'Lubrificante', 'Quantidade (L/Kg)', 'Usuário'];
      const rows = data.map((d: any) => [
        new Date(d.event_at).toLocaleString('pt-BR'),
        d.prefix,
        d.km.toString(),
        d.horimetro.toString(),
        d.lubricant_name,
        d.quantity.toString(),
        d.user_name || 'Admin'
      ]);

      downloadCSV(`Relatorio_Lubrificantes_${startDate}_${endDate}`, headers, rows);
    } catch (err: any) {
      alert("Erro ao exportar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportMaintenance = async () => {
    setLoading(true);
    setNoDataMessage(null);
    try {
      const { data, error } = await supabase
        .from('maintenance_history_view')
        .select('*')
        .gte('start_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`)
        .order('start_time', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        showNoDataAlert();
        return;
      }

      const headers = ['Data Início', 'Hora Início', 'Data Fim', 'Hora Fim', 'Prefixo', 'Motivo', 'Tempo Efetivo (Seg)', 'Tempo Efetivo (Formatado)', 'Técnico', 'Status'];
      const rows = data.map((d: any) => {
        const start = new Date(d.start_time);
        const end = d.end_time ? new Date(d.end_time) : null;
        
        const h = Math.floor(d.total_effective_seconds / 3600);
        const m = Math.floor((d.total_effective_seconds % 3600) / 60);
        const s = d.total_effective_seconds % 60;
        const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        return [
          start.toLocaleDateString('pt-BR'),
          start.toLocaleTimeString('pt-BR'),
          end ? end.toLocaleDateString('pt-BR') : '-',
          end ? end.toLocaleTimeString('pt-BR') : '-',
          d.prefix,
          d.opening_reason.replace(/(\r\n|\n|\r|")/gm, " "),
          d.total_effective_seconds.toString(),
          formatted,
          d.user_name,
          d.status
        ];
      });

      downloadCSV(`Relatorio_Manutencao_${startDate}_${endDate}`, headers, rows);
    } catch (err: any) {
      alert("Erro ao exportar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const separator = ';';
    const csvContent = [
      headers.join(separator),
      ...rows.map(row => row.map(cell => {
        const str = cell ? cell.toString() : '';
        return `"${str.replace(/"/g, '""')}"`;
      }).join(separator))
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
    else if (reportType === 'fuels') exportFuels();
    else if (reportType === 'lubricants') exportLubricants();
    else exportMaintenance();
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
            <button 
              onClick={() => { setReportType('checklists'); setNoDataMessage(null); }}
              className={`p-5 rounded-2xl border-2 transition-all text-left ${reportType === 'checklists' ? 'border-[#1E90FF] bg-blue-50/30' : 'border-slate-50 bg-slate-50/50'}`}
            >
              <p className="font-black text-[10px] text-[#0A2540] uppercase">Checklists</p>
            </button>

            <button 
              onClick={() => { setReportType('fuels'); setNoDataMessage(null); }}
              className={`p-5 rounded-2xl border-2 transition-all text-left ${reportType === 'fuels' ? 'border-[#58CC02] bg-green-50/30' : 'border-slate-50 bg-slate-50/50'}`}
            >
              <p className="font-black text-[10px] text-[#0A2540] uppercase">Abastecimento</p>
            </button>

            <button 
              onClick={() => { setReportType('lubricants'); setNoDataMessage(null); }}
              className={`p-5 rounded-2xl border-2 transition-all text-left ${reportType === 'lubricants' ? 'border-[#FFA500] bg-orange-50/30' : 'border-slate-50 bg-slate-50/50'}`}
            >
              <p className="font-black text-[10px] text-[#0A2540] uppercase">Lubrificante</p>
            </button>

            <button 
              onClick={() => { setReportType('maintenance'); setNoDataMessage(null); }}
              className={`p-5 rounded-2xl border-2 transition-all text-left ${reportType === 'maintenance' ? 'border-red-600 bg-red-50/30' : 'border-slate-50 bg-slate-50/50'}`}
            >
              <p className="font-black text-[10px] text-[#0A2540] uppercase">Manutenção</p>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Escolha o Período</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">De:</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setNoDataMessage(null); }} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 outline-none focus:bg-white focus:border-[#1E90FF] font-black text-sm text-[#0A2540]" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">Até:</label>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setNoDataMessage(null); }} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 outline-none focus:bg-white focus:border-[#1E90FF] font-black text-sm text-[#0A2540]" />
            </div>
          </div>
        </div>

        {noDataMessage && (
          <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[2rem] flex items-center gap-4 animate-in shake duration-300">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <p className="text-sm font-bold text-orange-700 leading-tight">{noDataMessage}</p>
          </div>
        )}

        <div className="pt-6 border-t border-slate-50">
          <button 
            onClick={handleExport}
            disabled={loading}
            className={`w-full py-5 rounded-2xl text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#0A2540] hover:bg-[#1E90FF]'}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Gerar e Baixar CSV
              </>
            )}
          </button>
          <p className="text-center text-[9px] font-bold text-slate-300 uppercase mt-4 tracking-widest">O arquivo será baixado automaticamente em formato .csv (Excel)</p>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;

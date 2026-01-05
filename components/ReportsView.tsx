
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { DBChecklistItem } from '../types';

interface ReportsViewProps {
  availableItems: DBChecklistItem[];
  onBack: () => void;
}

const ReportsView: React.FC<ReportsViewProps> = ({ availableItems, onBack }) => {
  const [reportType, setReportType] = useState<'checklists' | 'fuels' | 'lubricants' | 'maintenance' | 'pauses'>('checklists');
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

  const formatDurationCSV = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

      if (error) {
        if (error.code === '42P01') throw new Error("A tabela de vistorias (entries) não existe. Execute o script SQL no painel Supabase.");
        throw error;
      }
      
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
      alert("Erro ao exportar Checklist: " + err.message);
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

      if (error) {
        if (error.code === '42P01') throw new Error("A view de abastecimento (refueling_history_view) não existe. Execute o script SQL no painel Supabase.");
        throw error;
      }
      
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
      alert("Erro ao exportar Abastecimentos: " + err.message);
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

      if (error) {
        if (error.code === '42P01') throw new Error("A view de lubrificantes (lubricant_history_view) não existe.");
        throw error;
      }
      
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
      alert("Erro ao exportar Lubrificantes: " + err.message);
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

      if (error) {
        if (error.code === '42P01') throw new Error("A view de oficina (maintenance_history_view) não existe.");
        throw error;
      }
      
      if (!data || data.length === 0) {
        showNoDataAlert();
        return;
      }

      const headers = ['ID_SESSAO', 'Data Início', 'Hora Início', 'Data Fim', 'Hora Fim', 'Prefixo', 'Motivo Abertura', 'Tempo Efetivo (Seg)', 'Tempo Efetivo (Formatado)', 'Técnico', 'Status'];
      const rows = data.map((d: any) => {
        const start = new Date(d.start_time);
        const end = d.end_time ? new Date(d.end_time) : null;
        return [
          d.id,
          start.toLocaleDateString('pt-BR'),
          start.toLocaleTimeString('pt-BR'),
          end ? end.toLocaleDateString('pt-BR') : '-',
          end ? end.toLocaleTimeString('pt-BR') : '-',
          d.prefix,
          d.opening_reason.replace(/(\r\n|\n|\r|")/gm, " "),
          d.total_effective_seconds.toString(),
          formatDurationCSV(d.total_effective_seconds),
          d.user_name,
          d.status
        ];
      });

      downloadCSV(`Relatorio_Manutencao_${startDate}_${endDate}`, headers, rows);
    } catch (err: any) {
      alert("Erro ao exportar Manutenção: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPauses = async () => {
    setLoading(true);
    setNoDataMessage(null);
    try {
      // Busca sessões no período
      const { data: sessions, error: sError } = await supabase
        .from('maintenance_sessions')
        .select('id, prefix')
        .gte('start_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`);

      if (sError) throw sError;
      if (!sessions || sessions.length === 0) {
        showNoDataAlert();
        return;
      }

      const sessionIds = sessions.map(s => s.id);
      const { data: pauses, error: pError } = await supabase
        .from('maintenance_pauses')
        .select('*')
        .in('session_id', sessionIds)
        .order('pause_start', { ascending: true });

      if (pError) throw pError;
      if (!pauses || pauses.length === 0) {
        alert("Sessões encontradas, mas nenhuma pausa registrada neste período.");
        setLoading(false);
        return;
      }

      const headers = ['ID_SESSAO', 'Prefixo_Veiculo', 'Motivo_Pausa', 'Início_Pausa', 'Fim_Pausa', 'Duração_(Seg)', 'Duração_(Formatado)'];
      const rows = pauses.map((p: any) => {
        const session = sessions.find(s => s.id === p.session_id);
        const pStart = new Date(p.pause_start);
        const pEnd = p.pause_end ? new Date(p.pause_end) : null;
        const durationSec = pEnd ? Math.floor((pEnd.getTime() - pStart.getTime()) / 1000) : 0;
        
        return [
          p.session_id,
          session?.prefix || '?',
          p.reason,
          pStart.toLocaleString('pt-BR'),
          pEnd ? pEnd.toLocaleString('pt-BR') : 'EM CURSO',
          durationSec.toString(),
          formatDurationCSV(durationSec)
        ];
      });

      downloadCSV(`Relatorio_Pausas_Oficina_${startDate}_${endDate}`, headers, rows);
    } catch (err: any) {
      alert("Erro ao exportar pausas: " + err.message);
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
    else if (reportType === 'maintenance') exportMaintenance();
    else if (reportType === 'pauses') exportPauses();
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button onClick={() => { setReportType('checklists'); setNoDataMessage(null); }} className={`p-4 rounded-2xl border-2 transition-all text-center ${reportType === 'checklists' ? 'border-[#1E90FF] bg-blue-50/30' : 'border-slate-50 bg-slate-50/50'}`}>
              <p className="font-black text-[9px] text-[#0A2540] uppercase">Checklists</p>
            </button>
            <button onClick={() => { setReportType('fuels'); setNoDataMessage(null); }} className={`p-4 rounded-2xl border-2 transition-all text-center ${reportType === 'fuels' ? 'border-[#58CC02] bg-green-50/30' : 'border-slate-50 bg-slate-50/50'}`}>
              <p className="font-black text-[9px] text-[#0A2540] uppercase">Abast.</p>
            </button>
            <button onClick={() => { setReportType('lubricants'); setNoDataMessage(null); }} className={`p-4 rounded-2xl border-2 transition-all text-center ${reportType === 'lubricants' ? 'border-[#FFA500] bg-orange-50/30' : 'border-slate-50 bg-slate-50/50'}`}>
              <p className="font-black text-[9px] text-[#0A2540] uppercase">Lubrif.</p>
            </button>
            <button onClick={() => { setReportType('maintenance'); setNoDataMessage(null); }} className={`p-4 rounded-2xl border-2 transition-all text-center ${reportType === 'maintenance' ? 'border-red-600 bg-red-50/30' : 'border-slate-50 bg-slate-50/50'}`}>
              <p className="font-black text-[9px] text-[#0A2540] uppercase">Manut.</p>
            </button>
            <button onClick={() => { setReportType('pauses'); setNoDataMessage(null); }} className={`p-4 rounded-2xl border-2 transition-all text-center ${reportType === 'pauses' ? 'border-orange-500 bg-orange-50' : 'border-slate-50 bg-slate-50/50'}`}>
              <p className="font-black text-[9px] text-orange-600 uppercase">Pausas</p>
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
          <button onClick={handleExport} disabled={loading} className={`w-full py-5 rounded-2xl text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#0A2540] hover:bg-[#1E90FF]'}`}>
            {loading ? 'Processando...' : `Baixar Relatório ${reportType === 'pauses' ? 'de Pausas' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;


import React, { useState, useMemo } from 'react';
import { ChecklistEntry, ItemStatus, User, DBChecklistItem } from '../types';
import { OFFICIAL_SOLURB_ITEMS } from '../constants';
import { supabase } from '../lib/supabase';

interface HistoryViewProps {
  submissions: ChecklistEntry[];
  user: User;
  users?: User[];
  availableItems?: DBChecklistItem[];
  onBack: () => void;
  onRefresh?: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ 
  submissions, 
  user, 
  users = [], 
  availableItems = [], 
  onBack, 
  onRefresh 
}) => {
  const [selected, setSelected] = useState<ChecklistEntry | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<Record<string, any>>({});
  const [editObs, setEditObs] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredSubmissions = useMemo(() => {
    let list = submissions;
    if (user.role === 'OPERADOR') list = list.filter(s => s.user_id === user.id);
    if (dateFilter) list = list.filter(s => s.date === dateFilter);
    return list;
  }, [submissions, user, dateFilter]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const getItemLabel = (id: string) => {
    const numericId = parseInt(id);
    const dbItem = availableItems.find(i => i.id === numericId);
    if (dbItem) {
      const clean = dbItem.label.replace(/^\d+\.\s*/, '');
      return `${dbItem.id}. ${clean}`;
    }
    const item = OFFICIAL_SOLURB_ITEMS.find(i => i.id === numericId);
    if (item) {
      const clean = item.label.replace(/^\d+\.\s*/, '');
      return `${item.id}. ${clean}`;
    }
    return `Item ${id}`;
  };

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) return;

    // A fonte de verdade para as colunas do CSV deve ser os itens que existem no banco
    const itemsToExport = availableItems.length > 0 ? availableItems : OFFICIAL_SOLURB_ITEMS;
    
    // Cabeçalhos Base
    const baseHeaders = ['Data', 'Prefixo', 'Tipo', 'Turno', 'Motorista', 'KM', 'Horimetro', 'Observações Gerais'];
    
    // Itens dinâmicos
    const itemHeaders: string[] = [];
    itemsToExport.sort((a,b) => a.id - b.id).forEach(item => {
      const cleanLabel = item.label.replace(/^\d+\.\s*/, '');
      const shortLabel = `Item ${item.id} - ${cleanLabel}`;
      itemHeaders.push(`${shortLabel} (Status)`);
      itemHeaders.push(`${shortLabel} (Vistoriado)`);
      itemHeaders.push(`${shortLabel} (Obs)`);
    });

    const headers = [...baseHeaders, ...itemHeaders];

    const rows = filteredSubmissions.map(s => {
      const baseData = [
        s.date,
        s.prefix,
        s.type,
        s.shift,
        s.driver_name,
        s.km,
        s.horimetro,
        (s.general_observations || '').replace(/(\r\n|\n|\r|")/gm, " ")
      ];

      const itemData: any[] = [];
      itemsToExport.sort((a,b) => a.id - b.id).forEach(officialItem => {
        const itemId = officialItem.id.toString();
        const submissionItem = s.items[itemId];
        
        if (submissionItem) {
          itemData.push(submissionItem.status || 'OK');
          itemData.push(submissionItem.surveyed ? 'Sim' : 'Não');
          itemData.push((submissionItem.observations || '').replace(/(\r\n|\n|\r|")/gm, " "));
        } else {
          itemData.push('N/A');
          itemData.push('N/A');
          itemData.push('');
        }
      });

      return [...baseData, ...itemData];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ecoSCheck_Completo_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSignatureDisplay = (entry: ChecklistEntry, field: 'maintenance' | 'operation') => {
    const userId = field === 'maintenance' ? entry.maintenance_user_id : entry.operation_user_id;
    const checked = field === 'maintenance' ? entry.maintenance_checked : entry.operation_checked;
    
    if (checked && !userId) return 'DISPENSA AUTOMÁTICA';
    if (!checked) return 'PENDENTE';
    
    const u = users.find(u => u.id === userId);
    return u ? u.name : userId || 'VALIDADO';
  };

  const getStatusDisplay = (status: any) => {
    if (status === ItemStatus.OK) return 'OK';
    if (status === ItemStatus.DEFECTIVE) return 'DEFEITO';
    if (status === ItemStatus.MISSING) return 'FALTA';
    return status || 'Pendente';
  };

  const handleStartEdit = () => {
    if (!selected) return;
    setEditItems({ ...selected.items });
    setEditObs(selected.general_observations || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selected || !onRefresh) return;
    const hasChanged = JSON.stringify(editItems) !== JSON.stringify(selected.items);
    if (hasChanged && !editObs.trim()) {
      alert("Atenção: Justifique a alteração no campo de observações.");
      return;
    }

    setIsSaving(true);
    try {
      const hasDefects = Object.values(editItems).some((r: any) => r.status === ItemStatus.DEFECTIVE);
      const hasMissing = Object.values(editItems).some((r: any) => r.status === ItemStatus.MISSING);

      const { error } = await supabase
        .from('entries')
        .update({
          items: editItems,
          general_observations: editObs,
          has_issues: hasDefects || hasMissing,
          operation_checked: !hasMissing,
          operation_user_id: !hasMissing ? null : (hasChanged ? null : selected.operation_user_id),
          maintenance_checked: !hasDefects,
          maintenance_user_id: !hasDefects ? null : (hasChanged ? null : selected.maintenance_user_id)
        })
        .eq('id', selected.id);

      if (error) throw error;
      
      setIsEditing(false);
      onRefresh();
      setSelected({ ...selected, items: editItems, general_observations: editObs });
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const canExport = user.role === 'ADMIN' || user.role === 'OPERACAO' || user.role === 'MANUTENCAO';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 sm:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 mb-6 sm:mb-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={onBack} className="p-3 sm:p-4 bg-white shadow-sm border border-slate-100 rounded-xl sm:rounded-2xl hover:bg-slate-50 transition-all active:scale-95">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A2540] tracking-tight">Histórico</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <div className="bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 pl-4 sm:pl-5">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">Filtrar:</span>
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="p-2 sm:p-3 bg-slate-50 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm text-[#0A2540] border-0 outline-none w-full sm:w-auto" />
           </div>
           
           {canExport && (
             <button 
              onClick={exportToCSV}
              className="p-3 sm:p-4 bg-[#58CC02] text-white rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-lg shadow-green-100 flex items-center gap-2 active:scale-95 transition-all"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
               EXPORTAR TUDO (CSV)
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        <div className="lg:col-span-1 space-y-3 sm:space-y-4 max-h-[50vh] lg:max-h-[75vh] overflow-y-auto pr-2 hide-scrollbar bg-slate-50/50 p-4 rounded-3xl lg:p-0 lg:bg-transparent">
          {filteredSubmissions.length > 0 ? filteredSubmissions.map(sub => (
            <div key={sub.id} onClick={() => { setSelected(sub); setIsEditing(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`p-5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border-4 transition-all cursor-pointer active:scale-95 ${selected?.id === sub.id ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-xl lg:shadow-2xl' : 'bg-white shadow-sm border-white hover:border-slate-100'}`}>
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <span className="font-black text-xl sm:text-2xl tracking-tighter">{sub.prefix}</span>
                <span className={`text-[8px] sm:text-[9px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-widest ${selected?.id === sub.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'}`}>{sub.type}</span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold opacity-70 uppercase tracking-widest">{sub.date} às {formatTime(sub.created_at)}</p>
            </div>
          )) : (
            <div className="text-center p-10 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum registro</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-sm border border-slate-100 p-6 sm:p-10 space-y-8 sm:space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-50 pb-6 sm:pb-8">
                <div>
                  <h3 className="text-4xl sm:text-5xl font-black text-[#0A2540] tracking-tighter">{selected.prefix}</h3>
                  <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px] sm:text-xs">{selected.date} • {selected.type}</p>
                </div>
                {(user.role === 'OPERACAO' || user.role === 'ADMIN') && !isEditing && (
                  <button onClick={handleStartEdit} className="w-full sm:w-auto bg-[#1E90FF]/10 text-[#1E90FF] px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#1E90FF] hover:text-white transition-all active:scale-95">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    Editar
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-6 sm:space-y-8">
                  <div className="bg-[#1E90FF]/5 p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-2 border-[#1E90FF]/10">
                    <div className="space-y-4 max-h-[400px] sm:max-h-[450px] overflow-y-auto pr-2 sm:pr-3 hide-scrollbar">
                      {Object.entries(selected.items).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, data]: [string, any]) => (
                        <div key={id} className="flex flex-col gap-3 p-4 bg-white rounded-2xl sm:rounded-3xl border border-blue-50">
                          <span className="text-[11px] sm:text-xs font-black text-slate-700 leading-tight">{getItemLabel(id)}</span>
                          <div className="flex gap-2">
                            {Object.values(ItemStatus).map(s => (
                              <button 
                                key={s}
                                onClick={() => setEditItems(prev => ({ ...prev, [id]: { ...prev[id], status: s } }))}
                                className={`flex-1 py-3 sm:py-3.5 text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 ${editItems[id]?.status === s ? 'bg-[#1E90FF] text-white border-[#1E90FF] shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}
                              >{s}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <textarea value={editObs} onChange={e => setEditObs(e.target.value)} className="w-full p-5 sm:p-6 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] sm:rounded-[2.5rem] text-xs sm:text-sm font-bold outline-none h-24 sm:h-28 focus:bg-white focus:border-[#1E90FF] transition-all" placeholder="Justificativa..." />
                  <div className="flex gap-3 sm:gap-4">
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-4 sm:py-5 bg-slate-100 text-slate-500 rounded-2xl sm:rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95">Descartar</button>
                    <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-4 sm:py-5 bg-[#58CC02] text-white rounded-2xl sm:rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 active:scale-95">
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl"><p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 sm:mb-2">KM</p><p className="font-black text-lg sm:text-xl text-[#0A2540]">{selected.km}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl"><p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 sm:mb-2">HOR</p><p className="font-black text-lg sm:text-xl text-[#0A2540]">{selected.horimetro}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl"><p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 sm:mb-2">Turno</p><p className="font-black text-lg sm:text-xl text-[#0A2540]">{selected.shift}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl"><p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 sm:mb-2">Matric.</p><p className="font-black text-lg sm:text-xl text-[#0A2540]">{selected.driver_name.split(' ')[0]}</p></div>
                  </div>

                  <div className="space-y-5 sm:space-y-6">
                     <h4 className="font-black text-[#0A2540] text-lg sm:text-xl uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                        <div className="w-1.5 h-6 sm:w-2 sm:h-6 bg-[#1E90FF] rounded-full"></div>
                        Checklist Verificado
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                       {Object.entries(selected.items).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, data]: [string, any]) => (
                          <div key={id} className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 ${data.status === ItemStatus.OK ? 'bg-white border-slate-50' : (data.surveyed ? 'bg-red-50 border-red-50 text-red-700' : 'bg-slate-50 border-slate-100 opacity-60')}`}>
                             <div className="flex flex-col flex-1 truncate pr-3">
                                <span className={`text-[11px] sm:text-xs font-black truncate leading-tight ${data.surveyed ? 'text-slate-600' : 'text-slate-400 italic'}`}>{getItemLabel(id)}</span>
                                {!data.surveyed && <span className="text-[7px] uppercase font-bold text-slate-400">Não Vistoriado</span>}
                             </div>
                             {data.surveyed && (
                                <span className={`text-[8px] sm:text-[9px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl uppercase shrink-0 shadow-sm ${data.status === ItemStatus.OK ? 'bg-[#58CC02] text-white' : 'bg-red-600 text-white'}`}>{getStatusDisplay(data.status)}</span>
                             )}
                          </div>
                       ))}
                     </div>
                  </div>

                  <div className="space-y-6 pt-8 sm:pt-10 border-t border-slate-50">
                     <h4 className="font-black text-[#0A2540] text-lg sm:text-xl uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                        <div className="w-1.5 h-6 sm:w-2 sm:h-6 bg-[#58CC02] rounded-full"></div>
                        Vistos de Segurança
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                       <div className="p-5 sm:p-6 bg-[#0A2540] text-white rounded-[1.8rem] sm:rounded-[2.5rem] text-center shadow-lg">
                          <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 sm:mb-2">Motorista</p>
                          <p className="font-black truncate text-xs sm:text-sm">{selected.driver_name}</p>
                          <span className="mt-2.5 sm:mt-3 inline-block text-[9px] sm:text-[10px] bg-[#58CC02] text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black uppercase tracking-widest">ASSINADO</span>
                       </div>
                       <div className={`p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2.5rem] border-2 text-center transition-all ${selected.operation_checked ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                          <p className="text-[8px] sm:text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1 sm:mb-2">Operação</p>
                          <p className="font-black text-[#0A2540] truncate text-[11px] sm:text-xs">{getSignatureDisplay(selected, 'operation')}</p>
                          <span className={`mt-2.5 sm:mt-3 inline-block text-[9px] sm:text-[10px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black uppercase tracking-widest ${selected.operation_checked ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-300 text-white'}`}>{selected.operation_checked ? 'VALIDADO' : 'PENDENTE'}</span>
                       </div>
                       <div className={`p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2.5rem] border-2 text-center transition-all ${selected.maintenance_checked ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                          <p className="text-[8px] sm:text-[9px] font-black text-red-600 uppercase tracking-widest mb-1 sm:mb-2">Manutenção</p>
                          <p className="font-black text-[#0A2540] truncate text-[11px] sm:text-xs">{getSignatureDisplay(selected, 'maintenance')}</p>
                          <span className={`mt-2.5 sm:mt-3 inline-block text-[9px] sm:text-[10px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black uppercase tracking-widest ${selected.maintenance_checked ? 'bg-red-600 text-white shadow-md' : 'bg-slate-300 text-white'}`}>{selected.maintenance_checked ? 'VALIDADO' : 'PENDENTE'}</span>
                       </div>
                     </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[300px] sm:min-h-[500px] flex items-center justify-center text-slate-300 bg-white rounded-[2rem] sm:rounded-[4rem] border-4 border-dashed border-slate-100 text-center flex-col gap-4 sm:gap-6 p-8">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-50 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 sm:w-12 sm:h-12 text-slate-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                </div>
                <p className="font-black uppercase tracking-[0.3em] text-[9px] sm:text-[10px] leading-relaxed">Selecione um checklist para exibir os detalhes da inspeção</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;

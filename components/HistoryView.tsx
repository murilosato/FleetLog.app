
import React, { useState, useMemo, useEffect } from 'react';
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
  user, 
  users = [], 
  availableItems = [], 
  onBack, 
  onRefresh 
}) => {
  const [localSubmissions, setLocalSubmissions] = useState<ChecklistEntry[]>([]);
  const [selected, setSelected] = useState<ChecklistEntry | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<Record<string, any>>({});
  const [editObs, setEditObs] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChecklists = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false });

      // Se for operador, filtra apenas os dele diretamente no banco para performance e segurança
      if (user.role === 'OPERADOR') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLocalSubmissions((data as ChecklistEntry[]) || []);
    } catch (err) {
      console.error('Erro ao carregar checklists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const filteredSubmissions = useMemo(() => {
    let list = localSubmissions;
    if (dateFilter) list = list.filter(s => s.date === dateFilter);
    if (onlyPending) {
      list = list.filter(s => !s.operation_checked || !s.maintenance_checked);
    }
    return list;
  }, [localSubmissions, dateFilter, onlyPending]);

  const pendingCount = useMemo(() => {
    return localSubmissions.filter(s => !s.operation_checked || !s.maintenance_checked).length;
  }, [localSubmissions]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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

  const getSignatureDisplay = (entry: ChecklistEntry, field: 'maintenance' | 'operation') => {
    const userId = field === 'maintenance' ? entry.maintenance_user_id : entry.operation_user_id;
    const checked = field === 'maintenance' ? entry.maintenance_checked : entry.operation_checked;
    
    if (checked && !userId) return 'DISPENSA AUTOMÁTICA';
    if (!checked) return 'AGUARDANDO ASSINATURA';
    
    const u = users.find(u => u.id === userId);
    return u ? u.name : userId || 'VALIDADO';
  };

  const getStatusDisplay = (status: any) => {
    if (status === ItemStatus.OK) return 'OK';
    if (status === ItemStatus.DEFECTIVE) return 'DEFEITO';
    if (status === ItemStatus.MISSING) return 'FALTA';
    return status || 'Pendente';
  };

  const handleQuickValidate = async (field: 'operation' | 'maintenance') => {
    if (!selected) return;
    
    const confirmMsg = field === 'operation' 
      ? "Confirmar assinatura da Operação para este checklist?" 
      : "Confirmar assinatura da Manutenção/Mecânica para este checklist?";

    if (!confirm(confirmMsg)) return;

    setIsValidating(true);
    try {
      const updateData: any = {};
      if (field === 'operation') {
        updateData.operation_checked = true;
        updateData.operation_user_id = user.id;
      } else {
        updateData.maintenance_checked = true;
        updateData.maintenance_user_id = user.id;
      }

      const { error } = await supabase
        .from('entries')
        .update(updateData)
        .eq('id', selected.id);

      if (error) throw error;
      
      await fetchChecklists();
      setSelected({ ...selected, ...updateData });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Erro ao validar: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartEdit = () => {
    if (!selected) return;
    setEditItems({ ...selected.items });
    setEditObs(selected.general_observations || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
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
      await fetchChecklists();
      setSelected({ ...selected, items: editItems, general_observations: editObs });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 sm:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 mb-6 sm:mb-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={onBack} className="p-3 sm:p-4 bg-white shadow-sm border border-slate-100 rounded-xl sm:rounded-2xl hover:bg-slate-50 transition-all active:scale-95">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="text-3xl sm:text-4xl font-black text-[#0A2540] tracking-tight">Histórico</h2>
            {pendingCount > 0 && <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{pendingCount} pendências encontradas</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <button 
              onClick={() => setOnlyPending(!onlyPending)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${onlyPending ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-orange-200 hover:text-orange-500'}`}
           >
             {onlyPending ? 'Mostrando Pendentes' : 'Filtrar Pendentes'}
             {onlyPending && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>}
           </button>
           <div className="bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 pl-4 sm:pl-5">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">Data:</span>
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="p-2 sm:p-3 bg-slate-50 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm text-[#0A2540] border-0 outline-none w-full sm:w-auto" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        <div className="lg:col-span-1 space-y-3 sm:space-y-4 max-h-[50vh] lg:max-h-[75vh] overflow-y-auto pr-2 hide-scrollbar bg-slate-50/50 p-4 rounded-3xl lg:p-0 lg:bg-transparent">
          {isLoading ? (
            <div className="text-center p-10">
               <svg className="animate-spin h-8 w-8 text-[#1E90FF] mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Carregando vistorias...</p>
            </div>
          ) : filteredSubmissions.length > 0 ? filteredSubmissions.map(sub => {
            const opPending = !sub.operation_checked;
            const manPending = !sub.maintenance_checked;
            const isSelected = selected?.id === sub.id;

            return (
              <div key={sub.id} onClick={() => { setSelected(sub); setIsEditing(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`group p-5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border-4 transition-all cursor-pointer active:scale-95 relative overflow-hidden ${isSelected ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-xl' : 'bg-white shadow-sm border-white hover:border-slate-100'}`}>
                
                <div className="absolute top-0 right-0 flex">
                  {opPending && <div className="w-3 h-3 bg-orange-500 rounded-bl-xl shadow-[0_0_10px_rgba(249,115,22,0.5)] animate-pulse" title="Pendente Operação"></div>}
                  {manPending && <div className="w-3 h-3 bg-red-600 rounded-bl-xl shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse" title="Pendente Manutenção"></div>}
                </div>

                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <span className="font-black text-xl sm:text-2xl tracking-tighter">{sub.prefix}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[8px] sm:text-[9px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-widest ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'}`}>{sub.type}</span>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs font-bold opacity-70 uppercase tracking-widest">{formatDateDisplay(sub.date)} às {formatTime(sub.created_at)}</p>
              </div>
            );
          }) : (
            <div className="text-center p-10 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum registro encontrado</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-sm border border-slate-100 p-6 sm:p-10 space-y-8 sm:space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-50 pb-6 sm:pb-8">
                <div className="space-y-1">
                  <h3 className="text-4xl sm:text-5xl font-black text-[#0A2540] tracking-tighter">{selected.prefix}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">
                      {formatDateDisplay(selected.date)} às {formatTime(selected.created_at)}
                    </p>
                    <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                    <p className="text-[#1E90FF] font-black uppercase tracking-widest text-[10px] sm:text-xs">
                      {selected.type} - {selected.shift}
                    </p>
                  </div>
                  <p className="text-slate-500 font-bold text-[11px] sm:text-xs mt-2 bg-slate-50 px-3 py-1.5 rounded-lg inline-block border border-slate-100">
                    REALIZADO POR: <span className="text-[#0A2540] font-black uppercase">{selected.driver_name}</span>
                  </p>
                </div>
                {(user.role === 'OPERACAO' || user.role === 'ADMIN') && !isEditing && (
                  <button onClick={handleStartEdit} className="w-full sm:w-auto bg-[#1E90FF]/10 text-[#1E90FF] px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#1E90FF] hover:text-white transition-all active:scale-95">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    Revisar Checklist
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-6 sm:space-y-8">
                  <div className="bg-[#1E90FF]/5 p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-2 border-[#1E90FF]/10">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xs font-black text-[#1E90FF] uppercase tracking-widest">Revisão de Itens</h4>
                      <span className="text-[9px] font-bold text-slate-400">Clique no status para alterar</span>
                    </div>
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
                          {(editItems[id]?.status === ItemStatus.DEFECTIVE || editItems[id]?.status === ItemStatus.MISSING) && (
                            <input 
                              value={editItems[id]?.observations || ''}
                              onChange={e => setEditItems(prev => ({ ...prev, [id]: { ...prev[id], observations: e.target.value } }))}
                              placeholder="Observação do defeito..."
                              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-950 outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Justificativa da Alteração</label>
                    <textarea value={editObs} onChange={e => setEditObs(e.target.value)} className="w-full p-5 sm:p-6 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] sm:rounded-[2.5rem] text-xs sm:text-sm font-bold text-slate-950 outline-none h-24 sm:h-28 focus:bg-white focus:border-[#1E90FF] transition-all" placeholder="Informe o motivo da alteração ou validação..." />
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-4 sm:py-5 bg-slate-100 text-slate-500 rounded-2xl sm:rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95">Descartar</button>
                    <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-4 sm:py-5 bg-[#58CC02] text-white rounded-2xl sm:rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 active:scale-95">
                      {isSaving ? 'Salvando...' : 'Salvar Alteração'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl"><p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 sm:mb-2">KM</p><p className="font-black text-lg sm:text-xl text-[#0A2540]">{selected.km}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl"><p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 sm:mb-2">HOR</p><p className="font-black text-lg sm:text-xl text-[#0A2540]">{selected.horimetro}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl"><p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 sm:mb-2">Turno</p><p className="font-black text-lg sm:text-xl text-[#0A2540]">{selected.shift}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl"><p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 sm:mb-2">Prefix</p><p className="font-black text-lg sm:text-xl text-[#0A2540]">{selected.prefix}</p></div>
                  </div>

                  <div className="space-y-5 sm:space-y-6">
                     <h4 className="font-black text-[#0A2540] text-lg sm:text-xl uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                        <div className="w-1.5 h-6 sm:w-2 sm:h-6 bg-[#1E90FF] rounded-full"></div>
                        Checklist Verificado
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                       {Object.entries(selected.items).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, data]: [string, any]) => (
                          <div key={id} className={`flex flex-col p-4 rounded-2xl border-2 transition-all ${data.status === ItemStatus.OK ? 'bg-white border-slate-50' : (data.surveyed ? 'bg-red-50 border-red-50' : 'bg-slate-50 border-slate-100 opacity-60')}`}>
                             <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-col flex-1 truncate pr-3">
                                   <span className={`text-[11px] sm:text-xs font-black truncate leading-tight ${data.surveyed ? 'text-slate-800' : 'text-slate-400 italic'}`}>{getItemLabel(id)}</span>
                                </div>
                                {data.surveyed && (
                                   <span className={`text-[8px] sm:text-[9px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl uppercase shrink-0 shadow-sm ${data.status === ItemStatus.OK ? 'bg-[#58CC02] text-white' : 'bg-red-600 text-white'}`}>{getStatusDisplay(data.status)}</span>
                                )}
                             </div>
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
                          <span className="mt-2.5 sm:mt-3 inline-block text-[9px] sm:text-[10px] bg-[#58CC02] text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black uppercase tracking-widest">OK</span>
                       </div>
                       
                       <div className={`p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2.5rem] border-2 text-center transition-all ${selected.operation_checked ? 'bg-orange-50 border-orange-100' : 'bg-orange-500 border-orange-500 text-white shadow-xl animate-pulse'}`}>
                          <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 sm:mb-2 ${selected.operation_checked ? 'text-orange-600' : 'text-white/80'}`}>Operação</p>
                          <p className="font-black truncate text-[11px] sm:text-xs">{getSignatureDisplay(selected, 'operation')}</p>
                          {selected.operation_checked ? (
                             <span className="mt-2.5 sm:mt-3 inline-block text-[9px] sm:text-[10px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black uppercase tracking-widest bg-orange-500 text-white">VALIDADO</span>
                          ) : (
                             (user.role === 'OPERACAO' || user.role === 'ADMIN') && (
                               <button onClick={() => handleQuickValidate('operation')} disabled={isValidating} className="mt-2 w-full bg-white text-orange-600 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest">ASSINAR</button>
                             )
                          )}
                       </div>

                       <div className={`p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2.5rem] border-2 text-center transition-all ${selected.maintenance_checked ? 'bg-red-50 border-red-100' : 'bg-red-600 border-red-600 text-white shadow-xl animate-pulse'}`}>
                          <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 sm:mb-2 ${selected.maintenance_checked ? 'text-red-600' : 'text-white/80'}`}>Oficina</p>
                          <p className="font-black truncate text-[11px] sm:text-xs">{getSignatureDisplay(selected, 'maintenance')}</p>
                          {selected.maintenance_checked ? (
                             <span className="mt-2.5 sm:mt-3 inline-block text-[9px] sm:text-[10px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black uppercase tracking-widest bg-red-600 text-white">VALIDADO</span>
                          ) : (
                             (user.role === 'MANUTENCAO' || user.role === 'ADMIN') && (
                               <button onClick={() => handleQuickValidate('maintenance')} disabled={isValidating} className="mt-2 w-full bg-white text-red-600 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest">ASSINAR</button>
                             )
                          )}
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

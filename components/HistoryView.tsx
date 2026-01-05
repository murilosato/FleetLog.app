
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [onlyPending, setOnlyPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<Record<string, any>>({});
  const [editObs, setEditObs] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChecklists = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let query = supabase
        .from('checklist_entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: false });

      if (user.role === 'OPERADOR') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      
      if (error) {
        if (error.code === '42P01') {
          setErrorMessage("Erro de Configuração: A tabela 'checklist_entries' não foi encontrada.");
        } else {
          setErrorMessage("Erro ao buscar registros: " + error.message);
        }
        return;
      }
      
      setLocalSubmissions((data as ChecklistEntry[]) || []);
    } catch (err: any) {
      console.error('Erro crítico no histórico:', err);
      setErrorMessage("Erro interno ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, [startDate, endDate]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const filteredSubmissions = useMemo(() => {
    let list = localSubmissions;
    if (onlyPending) {
      list = list.filter(s => !s.operation_checked || !s.maintenance_checked);
    }
    return list;
  }, [localSubmissions, onlyPending]);

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
    return `Item ${id}`;
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

  const handleQuickValidate = async (field: 'operation' | 'maintenance') => {
    if (!selected) return;
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
        .from('checklist_entries')
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
    setIsSaving(true);
    try {
      const hasDefects = Object.values(editItems).some((r: any) => r.status === ItemStatus.DEFECTIVE);
      const hasMissing = Object.values(editItems).some((r: any) => r.status === ItemStatus.MISSING);

      const { error } = await supabase
        .from('checklist_entries')
        .update({
          items: editItems,
          general_observations: editObs,
          has_issues: hasDefects || hasMissing,
          operation_checked: !hasMissing,
          maintenance_checked: !hasDefects
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
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 mb-6 sm:mb-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={onBack} className="p-3 sm:p-4 bg-white shadow-sm border border-slate-100 rounded-xl sm:rounded-2xl hover:bg-slate-50 transition-all active:scale-95">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="text-3xl sm:text-4xl font-black text-[#0A2540] tracking-tight">Histórico</h2>
            {pendingCount > 0 && <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{pendingCount} pendências encontradas</span>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
           <button 
              onClick={() => setOnlyPending(!onlyPending)}
              className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 w-full sm:w-auto justify-center ${onlyPending ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-white border-slate-100 text-slate-400 hover:border-orange-200 hover:text-orange-500'}`}
           >
             {onlyPending ? 'Mostrando Pendentes' : 'Filtrar Pendentes'}
             {onlyPending && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>}
           </button>

           <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-3 px-3 py-1 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-slate-50">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">De:</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 bg-transparent font-black text-xs text-[#0A2540] border-0 outline-none w-full" />
              </div>
              <div className="flex items-center gap-3 px-3 py-1 w-full sm:w-auto">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Até:</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 bg-transparent font-black text-xs text-[#0A2540] border-0 outline-none w-full" />
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        {/* LISTA DE CARDS */}
        <div className="lg:col-span-1 space-y-3 sm:space-y-4 max-h-[60vh] lg:max-h-[75vh] overflow-y-auto pr-2 hide-scrollbar bg-slate-50/50 p-4 rounded-3xl lg:p-0 lg:bg-transparent">
          {isLoading ? (
            <div className="text-center p-10 bg-white rounded-3xl border-2 border-dashed border-slate-100">
               <svg className="animate-spin h-8 w-8 text-[#1E90FF] mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Consultando banco...</p>
            </div>
          ) : errorMessage ? (
            <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-100 text-center">
               <p className="text-[10px] font-black text-red-600 uppercase leading-relaxed">{errorMessage}</p>
            </div>
          ) : filteredSubmissions.length > 0 ? filteredSubmissions.map(sub => {
            const isSelected = selected?.id === sub.id;
            const opPending = !sub.operation_checked;
            const manPending = !sub.maintenance_checked;

            return (
              <div 
                key={sub.id} 
                onClick={() => { setSelected(sub); setIsEditing(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                className={`group relative pl-4 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 transition-all cursor-pointer active:scale-95 overflow-hidden ${isSelected ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-xl' : 'bg-white shadow-sm border-white hover:border-slate-100'}`}
              >
                {/* Indicadores Laterais de Pendência */}
                <div className="absolute left-0 top-0 bottom-0 w-2.5 flex flex-col">
                  {opPending && <div className="flex-1 bg-orange-500" title="Pendente Operação"></div>}
                  {manPending && <div className="flex-1 bg-red-600" title="Pendente Manutenção"></div>}
                </div>

                <div className="flex justify-between items-start mb-2">
                  <span className="font-black text-xl sm:text-2xl tracking-tighter">{sub.prefix}</span>
                  <span className={`text-[8px] sm:text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'}`}>{sub.type}</span>
                </div>
                <p className="text-[10px] sm:text-xs font-bold opacity-70 uppercase tracking-widest">{formatDateDisplay(sub.date)} às {formatTime(sub.created_at)}</p>
                
                {/* Indicadores de texto pequenos no rodapé do card */}
                <div className="flex gap-2 mt-3">
                  {opPending && <span className="text-[7px] font-black bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded uppercase">Op.</span>}
                  {manPending && <span className="text-[7px] font-black bg-red-600/10 text-red-600 px-1.5 py-0.5 rounded uppercase">Man.</span>}
                </div>
              </div>
            );
          }) : (
            <div className="text-center p-12 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum registro encontrado</p>
            </div>
          )}
        </div>

        {/* DETALHES DO SELECIONADO */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-sm border border-slate-100 p-6 sm:p-10 space-y-8 sm:space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-50 pb-6 sm:pb-8">
                <div className="space-y-1">
                  <h3 className="text-4xl sm:text-5xl font-black text-[#0A2540] tracking-tighter">{selected.prefix}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">{formatDateDisplay(selected.date)} às {formatTime(selected.created_at)}</p>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <p className="text-[#1E90FF] font-black uppercase tracking-widest text-[10px] sm:text-xs">{selected.type} - {selected.shift}</p>
                  </div>
                  <p className="text-slate-500 font-bold text-[11px] mt-2 bg-slate-50 px-3 py-1.5 rounded-lg inline-block border border-slate-100 uppercase">
                    Motorista: <span className="text-[#0A2540] font-black">{selected.driver_name}</span>
                  </p>
                </div>
                {(user.role === 'OPERACAO' || user.role === 'ADMIN') && !isEditing && (
                  <button onClick={handleStartEdit} className="w-full sm:w-auto bg-[#1E90FF]/10 text-[#1E90FF] px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#1E90FF] hover:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    Revisar Checklist
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-6 sm:space-y-8">
                   {/* Interface de edição simplificada */}
                   <p className="text-center font-black text-slate-400 uppercase text-[10px]">Editando Itens do Checklist...</p>
                   <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                     {Object.entries(selected.items).map(([id, data]: [string, any]) => (
                        <div key={id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                           <span className="text-[11px] font-black text-slate-700">{getItemLabel(id)}</span>
                           <div className="flex gap-2">
                              {Object.values(ItemStatus).map(s => (
                                <button key={s} onClick={() => setEditItems({...editItems, [id]: {...editItems[id], status: s}})} className={`px-3 py-1.5 rounded-lg text-[9px] font-black ${editItems[id]?.status === s ? 'bg-[#1E90FF] text-white' : 'bg-white text-slate-400'}`}>{s}</button>
                              ))}
                           </div>
                        </div>
                     ))}
                   </div>
                   <textarea value={editObs} onChange={e => setEditObs(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-sm h-24" placeholder="Justificativa da alteração..." />
                   <div className="flex gap-3">
                      <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Descartar</button>
                      <button onClick={handleSaveEdit} className="flex-1 py-4 bg-[#58CC02] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Salvar Revisão</button>
                   </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-300 uppercase mb-1">KM</p><p className="font-black text-lg text-[#0A2540]">{selected.km}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-300 uppercase mb-1">HOR</p><p className="font-black text-lg text-[#0A2540]">{selected.horimetro}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-300 uppercase mb-1">Turno</p><p className="font-black text-lg text-[#0A2540]">{selected.shift}</p></div>
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-300 uppercase mb-1">Prefix</p><p className="font-black text-lg text-[#0A2540]">{selected.prefix}</p></div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="font-black text-[#0A2540] text-lg uppercase flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#1E90FF] rounded-full"></div>
                        Itens Verificados
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {Object.entries(selected.items).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, data]: [string, any]) => {
                          const isNotSurveyed = data.surveyed === false;
                          const isOk = data.status === ItemStatus.OK;
                          
                          let containerClass = isOk ? 'bg-white border-slate-50' : 'bg-red-50 border-red-50';
                          let badgeClass = isOk ? 'bg-[#58CC02] text-white' : 'bg-red-600 text-white';
                          let statusLabel = getStatusDisplay(data.status);

                          if (isNotSurveyed) {
                            containerClass = 'bg-slate-50 border-slate-50 opacity-70';
                            badgeClass = 'bg-slate-200 text-slate-500';
                            statusLabel = 'NÃO VISTORIADO';
                          }

                          return (
                            <div key={id} className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${containerClass}`}>
                               <span className="text-[11px] font-black truncate text-slate-700 pr-3">{getItemLabel(id)}</span>
                               <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${badgeClass}`}>{statusLabel}</span>
                            </div>
                          );
                       })}
                     </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                     <h4 className="font-black text-[#0A2540] text-lg uppercase mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#58CC02] rounded-full"></div>
                        Vistos de Segurança
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {/* Motorista */}
                       <div className="p-5 bg-[#0A2540] text-white rounded-[2rem] text-center shadow-lg">
                          <p className="text-[8px] font-black uppercase opacity-60 mb-1">Motorista</p>
                          <p className="font-black truncate text-xs mb-2">{selected.driver_name}</p>
                          <span className="text-[9px] bg-[#58CC02] text-white px-3 py-1 rounded-full font-black uppercase">CONFIRMADO</span>
                       </div>
                       
                       {/* Operação */}
                       <div className={`p-5 rounded-[2rem] border-2 text-center transition-all ${selected.operation_checked ? 'bg-orange-50 border-orange-100' : 'bg-orange-500 border-orange-500 text-white shadow-xl animate-pulse'}`}>
                          <p className={`text-[8px] font-black uppercase mb-1 ${selected.operation_checked ? 'text-orange-600' : 'text-white/80'}`}>Operação</p>
                          <p className="font-black truncate text-[11px] mb-2">{getSignatureDisplay(selected, 'operation')}</p>
                          {selected.operation_checked ? (
                             <span className="text-[9px] px-3 py-1 rounded-full font-black uppercase bg-orange-500 text-white">VALIDADO</span>
                          ) : (
                             (user.role === 'OPERACAO' || user.role === 'ADMIN') ? (
                               <button onClick={() => handleQuickValidate('operation')} disabled={isValidating} className="w-full bg-white text-orange-600 px-3 py-2 rounded-xl font-black text-[9px] uppercase hover:scale-105 transition-transform shadow-md">ASSINAR AGORA</button>
                             ) : (
                               <span className="text-[8px] font-black opacity-60 uppercase">Aguardando...</span>
                             )
                          )}
                       </div>

                       {/* Oficina */}
                       <div className={`p-5 rounded-[2rem] border-2 text-center transition-all ${selected.maintenance_checked ? 'bg-red-50 border-red-100' : 'bg-red-600 border-red-600 text-white shadow-xl animate-pulse'}`}>
                          <p className={`text-[8px] font-black uppercase mb-1 ${selected.maintenance_checked ? 'text-red-600' : 'text-white/80'}`}>Oficina</p>
                          <p className="font-black truncate text-[11px] mb-2">{getSignatureDisplay(selected, 'maintenance')}</p>
                          {selected.maintenance_checked ? (
                             <span className="text-[9px] px-3 py-1 rounded-full font-black uppercase bg-red-600 text-white">VALIDADO</span>
                          ) : (
                             (user.role === 'MANUTENCAO' || user.role === 'ADMIN') ? (
                               <button onClick={() => handleQuickValidate('maintenance')} disabled={isValidating} className="w-full bg-white text-red-600 px-3 py-2 rounded-xl font-black text-[9px] uppercase hover:scale-105 transition-transform shadow-md">ASSINAR AGORA</button>
                             ) : (
                               <span className="text-[8px] font-black opacity-60 uppercase">Aguardando...</span>
                             )
                          )}
                       </div>
                     </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center text-slate-300 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 text-center flex-col gap-6 p-8">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                </div>
                <p className="font-black uppercase tracking-[0.2em] text-[10px]">Selecione um checklist para gerenciar assinaturas e detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;

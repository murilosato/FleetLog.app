
import React, { useState, useMemo } from 'react';
import { ChecklistEntry, ItemStatus, User } from '../types';
import { OFFICIAL_SOLURB_ITEMS } from '../constants';
import { supabase } from '../lib/supabase';

interface HistoryViewProps {
  submissions: ChecklistEntry[];
  user: User;
  users?: User[];
  onBack: () => void;
  onRefresh?: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ submissions, user, users = [], onBack, onRefresh }) => {
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
    const item = OFFICIAL_SOLURB_ITEMS.find(i => i.id.toString() === id);
    return item ? item.label : `Item ${id}`;
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
            <svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-4xl font-black text-[#0A2540] tracking-tight">Histórico</h2>
        </div>
        <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 pl-5">
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Filtrar Data:</span>
           <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="p-3 bg-slate-50 rounded-xl font-black text-sm text-[#0A2540] border-0 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-4 max-h-[75vh] overflow-y-auto pr-3 hide-scrollbar">
          {filteredSubmissions.length > 0 ? filteredSubmissions.map(sub => (
            <div key={sub.id} onClick={() => { setSelected(sub); setIsEditing(false); }} className={`p-6 rounded-[2.5rem] border-4 transition-all cursor-pointer ${selected?.id === sub.id ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-2xl scale-[1.02]' : 'bg-white shadow-sm border-white hover:border-slate-100'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className="font-black text-2xl tracking-tighter">{sub.prefix}</span>
                <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${selected?.id === sub.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'}`}>{sub.type}</span>
              </div>
              <p className="text-xs font-bold opacity-70 uppercase tracking-widest">{sub.date} às {formatTime(sub.created_at)}</p>
            </div>
          )) : (
            <div className="text-center p-10 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <p className="text-[10px] font-black text-slate-300 uppercase">Nenhum registro</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 p-10 space-y-10 animate-in fade-in duration-500">
              <div className="flex justify-between items-start border-b border-slate-50 pb-8">
                <div>
                  <h3 className="text-5xl font-black text-[#0A2540] tracking-tighter">{selected.prefix}</h3>
                  <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-xs">{selected.date} • {selected.type}</p>
                </div>
                {(user.role === 'OPERACAO' || user.role === 'ADMIN') && !isEditing && (
                  <button onClick={handleStartEdit} className="bg-[#1E90FF]/10 text-[#1E90FF] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-[#1E90FF] hover:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    Editar Dados
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-8">
                  <div className="bg-[#1E90FF]/5 p-8 rounded-[3rem] border-2 border-[#1E90FF]/10">
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-3">
                      {Object.entries(editItems).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, data]: [string, any]) => (
                        <div key={id} className="flex flex-col gap-3 p-4 bg-white rounded-3xl border border-blue-50">
                          <span className="text-xs font-black text-slate-700">{getItemLabel(id)}</span>
                          <div className="flex gap-2">
                            {Object.values(ItemStatus).map(s => (
                              <button 
                                key={s}
                                onClick={() => setEditItems(prev => ({ ...prev, [id]: { ...prev[id], status: s } }))}
                                className={`flex-1 py-3 text-[9px] font-black rounded-xl border-2 transition-all ${editItems[id].status === s ? 'bg-[#1E90FF] text-white border-[#1E90FF] shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}
                              >{s}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <textarea value={editObs} onChange={e => setEditObs(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-[2.5rem] text-sm font-bold outline-none h-28 focus:bg-white focus:border-[#1E90FF] transition-all" placeholder="Justificativa obrigatória da alteração..." />
                  <div className="flex gap-4">
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest">Descartar</button>
                    <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-5 bg-[#58CC02] text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-green-100">
                      {isSaving ? 'Salvando...' : 'Confirmar Mudanças'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">KM</p><p className="font-black text-xl text-[#0A2540]">{selected.km}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Horímetro</p><p className="font-black text-xl text-[#0A2540]">{selected.horimetro}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Turno</p><p className="font-black text-xl text-[#0A2540]">{selected.shift}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Matrícula</p><p className="font-black text-xl text-[#0A2540]">{selected.driver_name.split(' ')[0]}</p></div>
                  </div>

                  <div className="space-y-6">
                     <h4 className="font-black text-[#0A2540] text-xl uppercase tracking-tight flex items-center gap-3">
                        <div className="w-2 h-6 bg-[#1E90FF] rounded-full"></div>
                        Checklist Verificado
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {Object.entries(selected.items).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, data]: [string, any]) => (
                          <div key={id} className={`flex items-center justify-between p-4 rounded-2xl border-2 ${data.status === ItemStatus.OK ? 'bg-white border-slate-50' : 'bg-red-50 border-red-50 text-red-700'}`}>
                             <span className="text-xs font-black truncate pr-4 text-slate-600">{getItemLabel(id)}</span>
                             <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase shrink-0 ${data.status === ItemStatus.OK ? 'bg-[#58CC02] text-white shadow-sm' : 'bg-red-600 text-white shadow-sm'}`}>{getStatusDisplay(data.status)}</span>
                          </div>
                       ))}
                     </div>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-slate-50">
                     <h4 className="font-black text-[#0A2540] text-xl uppercase tracking-tight flex items-center gap-3">
                        <div className="w-2 h-6 bg-[#58CC02] rounded-full"></div>
                        Vistos de Segurança
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="p-6 bg-[#0A2540] text-white rounded-[2.5rem] text-center shadow-xl shadow-blue-900/10">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Motorista</p>
                          <p className="font-black truncate text-sm">{selected.driver_name}</p>
                          <span className="mt-3 inline-block text-[10px] bg-[#58CC02] text-white px-4 py-1.5 rounded-full font-black uppercase tracking-widest">ASSINADO</span>
                       </div>
                       <div className={`p-6 rounded-[2.5rem] border-2 text-center transition-all ${selected.operation_checked ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                          <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-2">Operação</p>
                          <p className="font-black text-[#0A2540] truncate text-xs">{getSignatureDisplay(selected, 'operation')}</p>
                          <span className={`mt-3 inline-block text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest ${selected.operation_checked ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-slate-300 text-white'}`}>{selected.operation_checked ? 'VALIDADO' : 'PENDENTE'}</span>
                       </div>
                       <div className={`p-6 rounded-[2.5rem] border-2 text-center transition-all ${selected.maintenance_checked ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2">Manutenção</p>
                          <p className="font-black text-[#0A2540] truncate text-xs">{getSignatureDisplay(selected, 'maintenance')}</p>
                          <span className={`mt-3 inline-block text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest ${selected.maintenance_checked ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-slate-300 text-white'}`}>{selected.maintenance_checked ? 'VALIDADO' : 'PENDENTE'}</span>
                       </div>
                     </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center text-slate-300 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 text-center flex-col gap-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-slate-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                </div>
                <p className="font-black uppercase tracking-[0.4em] text-[10px]">Selecione um checklist para exibir detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;

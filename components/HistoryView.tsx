
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Histórico</h2>
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="p-3 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 hide-scrollbar">
          {filteredSubmissions.map(sub => (
            <div key={sub.id} onClick={() => { setSelected(sub); setIsEditing(false); }} className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${selected?.id === sub.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white shadow-sm border-transparent'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-black text-xl">{sub.prefix}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${selected?.id === sub.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{sub.type}</span>
              </div>
              <p className="text-sm opacity-80">{sub.date} às {formatTime(sub.created_at)}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-start border-b pb-8">
                <div>
                  <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{selected.prefix}</h3>
                  <p className="text-slate-400 font-medium">{selected.date}</p>
                </div>
                {(user.role === 'OPERACAO' || user.role === 'ADMIN') && !isEditing && (
                  <button onClick={handleStartEdit} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    Editar Itens
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-6">
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {Object.entries(editItems).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, data]: [string, any]) => (
                        <div key={id} className="flex flex-col gap-2 p-3 bg-white rounded-2xl border border-emerald-200">
                          <span className="text-xs font-bold text-slate-700">{getItemLabel(id)}</span>
                          <div className="flex gap-2">
                            {Object.values(ItemStatus).map(s => (
                              <button 
                                key={s}
                                onClick={() => setEditItems(prev => ({ ...prev, [id]: { ...prev[id], status: s } }))}
                                className={`flex-1 py-2 text-[8px] font-black rounded-lg border transition-all ${editItems[id].status === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                              >{s}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <textarea value={editObs} onChange={e => setEditObs(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none h-24" placeholder="Justificativa da mudança..." />
                  <div className="flex gap-4">
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs">Cancelar</button>
                    <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-emerald-100">
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">KM</p><p className="font-black text-slate-700">{selected.km}</p></div>
                    <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Horímetro</p><p className="font-black text-slate-700">{selected.horimetro}</p></div>
                    <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Turno</p><p className="font-black text-slate-700">{selected.shift}</p></div>
                    <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tipo</p><p className="font-black text-slate-700">{selected.type}</p></div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">Itens da Vistoria</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                       {Object.entries(selected.items).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, data]: [string, any]) => (
                          <div key={id} className={`flex items-center justify-between p-3 rounded-xl border ${data.status === ItemStatus.OK ? 'bg-white border-slate-100' : 'bg-red-50 border-red-100 text-red-700'}`}>
                             <span className="text-xs font-bold truncate pr-4">{getItemLabel(id)}</span>
                             <span className={`text-[8px] font-black px-2 py-1 rounded uppercase shrink-0 ${data.status === ItemStatus.OK ? 'bg-emerald-100 text-emerald-700' : 'bg-red-600 text-white'}`}>{getStatusDisplay(data.status)}</span>
                          </div>
                       ))}
                     </div>
                  </div>

                  <div className="space-y-4 pt-8 border-t">
                     <h4 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">Assinaturas e Vistos</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center">
                          <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Motorista</p>
                          <p className="font-black text-slate-800 truncate">{selected.driver_name}</p>
                          <span className="mt-2 inline-block text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full font-bold uppercase">ASSINADO</span>
                       </div>
                       <div className={`p-5 rounded-[2rem] border text-center ${selected.operation_checked ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-dashed opacity-60'}`}>
                          <p className="text-[8px] font-black text-orange-600 uppercase mb-1">Operação (Faltas)</p>
                          <p className="font-black text-slate-800 truncate text-xs">{getSignatureDisplay(selected, 'operation')}</p>
                          <span className={`mt-2 inline-block text-[10px] px-3 py-1 rounded-full font-bold uppercase ${selected.operation_checked ? 'bg-orange-500 text-white' : 'bg-slate-300 text-white'}`}>{selected.operation_checked ? 'VALIDADO' : 'PENDENTE'}</span>
                       </div>
                       <div className={`p-5 rounded-[2rem] border text-center ${selected.maintenance_checked ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-dashed opacity-60'}`}>
                          <p className="text-[8px] font-black text-red-600 uppercase mb-1">Manutenção (Defeitos)</p>
                          <p className="font-black text-slate-800 truncate text-xs">{getSignatureDisplay(selected, 'maintenance')}</p>
                          <span className={`mt-2 inline-block text-[10px] px-3 py-1 rounded-full font-bold uppercase ${selected.maintenance_checked ? 'bg-red-600 text-white' : 'bg-slate-300 text-white'}`}>{selected.maintenance_checked ? 'VALIDADO' : 'PENDENTE'}</span>
                       </div>
                     </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center text-slate-300 bg-white rounded-[2rem] border-4 border-dashed border-slate-100 text-center font-black uppercase tracking-widest text-[10px]">Selecione um checklist para visualizar</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;

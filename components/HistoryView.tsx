
import React, { useState, useMemo } from 'react';
import { ChecklistEntry, ItemStatus, User } from '../types';
import { OFFICIAL_SOLURB_ITEMS } from '../constants';

interface HistoryViewProps {
  submissions: ChecklistEntry[];
  user: User;
  users?: User[];
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ submissions, user, users = [], onBack }) => {
  const [selected, setSelected] = useState<ChecklistEntry | null>(null);
  const [dateFilter, setDateFilter] = useState('');

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

  const getUserName = (userId?: string) => {
    if (!userId) return null;
    return users.find(u => u.id === userId)?.name || userId;
  };

  // Helper para garantir que o texto do status seja exibido corretamente
  const getStatusDisplay = (status: any) => {
    if (status === ItemStatus.OK) return 'OK';
    if (status === ItemStatus.DEFECTIVE) return 'DEFEITO';
    if (status === ItemStatus.MISSING) return 'FALTA';
    return status || 'Pendente';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white shadow-sm border border-slate-100 hover:bg-slate-50 rounded-2xl transition-all">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Histórico</h2>
            <p className="text-slate-400 text-sm font-medium">{user.role === 'OPERADOR' ? 'Minhas vistorias' : 'Relatórios da frota'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border">
          <label className="text-[10px] font-black uppercase text-slate-400 px-2">Data:</label>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="p-2 bg-slate-50 rounded-xl font-bold text-sm outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 hide-scrollbar">
          {filteredSubmissions.map(sub => (
            <div key={sub.id} onClick={() => setSelected(sub)} className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${selected?.id === sub.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl' : 'bg-white border-transparent hover:border-slate-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-black text-xl">{sub.prefix}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${selected?.id === sub.id ? 'bg-white/20' : (sub.type === 'Saída' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}`}>{sub.type}</span>
              </div>
              <p className="text-sm opacity-80">{sub.date} • {formatTime(sub.created_at)}</p>
            </div>
          ))}
          {filteredSubmissions.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest border-2 border-dashed rounded-3xl">Nenhum registro</div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex justify-between items-start border-b pb-8">
                <div>
                  <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{selected.prefix}</h3>
                  <p className="text-slate-400 font-medium">{selected.date} às {formatTime(selected.created_at)}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs font-black text-emerald-600 uppercase mb-1">Motorista</p>
                   <p className="text-xl font-bold text-slate-800">{selected.driver_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">KM Atual</p>
                  <p className="font-black text-slate-700">{selected.km}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Horímetro</p>
                  <p className="font-black text-slate-700">{selected.horimetro}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Turno</p>
                  <p className="font-black text-slate-700">{selected.shift}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Operação</p>
                  <p className="font-black text-slate-700">{selected.type}</p>
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                   <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                   Checklist Detalhado (Itens 1-48)
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   {Object.entries(selected.items)
                    .filter(([id]) => parseInt(id) <= 48)
                    .sort((a,b) => parseInt(a[0]) - parseInt(b[0]))
                    .map(([id, data]: [string, any]) => (
                      <div key={id} className={`flex items-center justify-between p-3 rounded-xl border ${data.status === ItemStatus.OK ? 'bg-white border-slate-100' : (data.status === ItemStatus.DEFECTIVE ? 'bg-red-50 border-red-100 text-red-700' : 'bg-orange-50 border-orange-100 text-orange-700')}`}>
                         <span className="text-xs font-bold truncate pr-4">{getItemLabel(id)}</span>
                         <span className={`text-[8px] font-black px-2 py-1 rounded uppercase shrink-0 ${data.status === ItemStatus.OK ? 'bg-emerald-100 text-emerald-700' : (data.status === ItemStatus.DEFECTIVE ? 'bg-red-600 text-white' : 'bg-orange-500 text-white')}`}>
                           {getStatusDisplay(data.status)}
                         </span>
                      </div>
                   ))}
                 </div>
              </div>

              <div className="space-y-4 pt-8 border-t">
                 <h4 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                   <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                   Assinaturas Digitais
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center space-y-1">
                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Motorista/Operador</p>
                      <p className="font-black text-slate-800">{selected.driver_name}</p>
                      <div className="pt-2">
                        <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full font-bold uppercase">ASSINADO</span>
                      </div>
                   </div>

                   <div className={`p-5 rounded-[2rem] border text-center space-y-1 ${selected.operation_checked ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                      <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Visto Operação (Faltas)</p>
                      <p className="font-black text-slate-800">{selected.operation_checked ? getUserName(selected.operation_user_id) : 'Pendente'}</p>
                      <div className="pt-2">
                        {selected.operation_checked ? (
                          <span className="text-[10px] bg-orange-500 text-white px-3 py-1 rounded-full font-bold uppercase">VALIDADO</span>
                        ) : (
                          <span className="text-[10px] bg-slate-300 text-white px-3 py-1 rounded-full font-bold uppercase">AGUARDANDO</span>
                        )}
                      </div>
                   </div>

                   <div className={`p-5 rounded-[2rem] border text-center space-y-1 ${selected.maintenance_checked ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                      <p className="text-[8px] font-black text-red-600 uppercase tracking-widest">Visto Manutenção (Defeitos)</p>
                      <p className="font-black text-slate-800">{selected.maintenance_checked ? getUserName(selected.maintenance_user_id) : 'Pendente'}</p>
                      <div className="pt-2">
                        {selected.maintenance_checked ? (
                          <span className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full font-bold uppercase">VALIDADO</span>
                        ) : (
                          <span className="text-[10px] bg-slate-300 text-white px-3 py-1 rounded-full font-bold uppercase">AGUARDANDO</span>
                        )}
                      </div>
                   </div>
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center text-slate-300 bg-white rounded-[2rem] border-4 border-dashed">
               <div className="text-center">
                 <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                 <p className="font-bold uppercase tracking-widest text-[10px]">Selecione um relatório para visualizar detalhes</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;

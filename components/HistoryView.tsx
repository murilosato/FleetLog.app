
import React, { useState } from 'react';
import { ChecklistEntry, ItemStatus } from '../types';

interface HistoryViewProps {
  submissions: ChecklistEntry[];
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ submissions, onBack }) => {
  const [selected, setSelected] = useState<ChecklistEntry | null>(null);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-3 bg-white shadow-sm border border-slate-100 hover:bg-slate-50 rounded-2xl transition-all"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Histórico</h2>
          <p className="text-slate-400 text-sm font-medium">Relatórios de vistorias anteriores</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {submissions.length === 0 && (
            <div className="text-center py-20 text-slate-300 italic bg-white rounded-3xl border-2 border-dashed border-slate-100">
              Nenhum registro encontrado.
            </div>
          )}
          {submissions.map(sub => (
            <div 
              key={sub.id}
              onClick={() => setSelected(sub)}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer transform ${
                selected?.id === sub.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-100 scale-[1.02]' : 'bg-white border-transparent hover:border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-black text-xl ${selected?.id === sub.id ? 'text-white' : 'text-slate-800'}`}>{sub.prefix}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${selected?.id === sub.id ? 'bg-white/20 text-white' : (sub.type === 'Saída' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}`}>
                  {sub.type}
                </span>
              </div>
              <p className={`text-sm ${selected?.id === sub.id ? 'text-white/80' : 'text-slate-500'}`}>{sub.date} • {formatTime(sub.created_at)}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${sub.has_issues ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${selected?.id === sub.id ? 'text-white/70' : 'text-slate-400'}`}>
                  {sub.has_issues ? 'Com Irregularidades' : 'Veículo OK'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-50 pb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{selected.prefix}</h3>
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{selected.type}</span>
                  </div>
                  <p className="text-slate-400 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    {selected.date} às {formatTime(selected.created_at)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                   <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Responsável</p>
                   <p className="text-xl font-bold text-slate-800 leading-tight">{selected.driver_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                 <div className="bg-slate-50 p-5 rounded-3xl">
                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">KM Atual</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{selected.km}</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-3xl">
                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Horímetro</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{selected.horimetro}</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-3xl col-span-2 sm:col-span-1">
                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Turno</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{selected.shift}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2">
                   <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                   Status da Vistoria
                 </h4>
                 <div className="grid grid-cols-1 gap-2">
                   {Object.entries(selected.items).map(([id, data]: [string, any]) => (
                    <div key={id} className={`flex items-center justify-between p-4 rounded-2xl border ${!data.surveyed ? 'bg-slate-50 border-slate-100 opacity-60' : (data.status === ItemStatus.OK ? 'bg-white border-slate-50' : 'bg-red-50 border-red-100')}`}>
                       <div className="flex flex-col">
                         <span className="text-xs font-bold text-slate-700">Item ID: {id}</span>
                         {!data.surveyed && <span className="text-[10px] text-slate-400 font-bold uppercase">NÃO VISTORIADO</span>}
                         {data.observations && <p className="text-[10px] italic text-slate-500 mt-1">"{data.observations}"</p>}
                       </div>
                       {data.surveyed && (
                         <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${data.status === ItemStatus.OK ? 'bg-emerald-100 text-emerald-700' : 'bg-red-600 text-white'}`}>
                           {data.status}
                         </span>
                       )}
                    </div>
                   ))}
                 </div>
              </div>

              {selected.general_observations && (
                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 relative overflow-hidden">
                   <h4 className="font-black text-amber-800 text-xs mb-3 uppercase tracking-widest">Observações do Motorista</h4>
                   <p className="text-amber-900 text-sm font-medium leading-relaxed relative z-10 italic">"{selected.general_observations}"</p>
                   <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-200/30 rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3H21.017V21H14.017ZM3.01697 21L3.01697 18C3.01697 16.8954 3.9124 16 5.01697 16H8.01697C8.56925 16 9.01697 15.5523 9.01697 15V9C9.01697 8.44772 8.56925 8 8.01697 8H5.01697C3.9124 8 3.01697 7.10457 3.01697 6V3H10.017V21H3.01697Z"/></svg>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-300 bg-white rounded-[2rem] border-4 border-dashed border-slate-50">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
               </div>
               <p className="font-bold uppercase tracking-widest text-xs">Selecione um relatório ao lado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;

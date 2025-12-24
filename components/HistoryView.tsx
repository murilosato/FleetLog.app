
import React, { useState } from 'react';
import { ChecklistSubmission, ItemStatus } from '../types';

interface HistoryViewProps {
  submissions: ChecklistSubmission[];
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ submissions, onBack }) => {
  const [selected, setSelected] = useState<ChecklistSubmission | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Histórico de Inspeções</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 space-y-3">
          {submissions.length === 0 && (
            <div className="text-center py-12 text-slate-400 italic bg-white rounded-xl border border-dashed">
              Nenhuma inspeção encontrada.
            </div>
          )}
          {submissions.map(sub => (
            <div 
              key={sub.id}
              onClick={() => setSelected(sub)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selected?.id === sub.id ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-lg text-slate-800">{sub.prefix}</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase">{sub.id}</span>
              </div>
              <p className="text-sm text-slate-600">{sub.date} • {sub.departureTime}</p>
              <p className="text-xs text-slate-500 mt-1">{sub.driverName}</p>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Inspeção Veículo {selected.prefix}</h3>
                  <p className="text-slate-500">{selected.date} às {selected.departureTime}</p>
                </div>
                <div className="text-right">
                   <p className="text-sm font-semibold text-emerald-700">{selected.driverName}</p>
                   <p className="text-xs text-slate-400">ID: {selected.driverId}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                 <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Quilometragem</p>
                    <p className="font-bold">{selected.km} KM</p>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Horímetro</p>
                    <p className="font-bold">{selected.hourmeter}</p>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Turno</p>
                    <p className="font-bold">{selected.shift === 'Day' ? 'Diurno' : 'Noturno'}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-bold text-slate-700 flex items-center gap-2">
                   <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                   Itens Críticos (Falta/Defeito)
                 </h4>
                 <div className="space-y-2">
                   {selected.sections.flatMap(s => s.items).filter(i => i.status !== ItemStatus.OK).length > 0 ? (
                      selected.sections.flatMap(s => s.items).filter(i => i.status !== ItemStatus.OK).map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
                           <span className="font-medium">{item.label}</span>
                           <span className="text-xs font-bold uppercase">{item.status}</span>
                        </div>
                      ))
                   ) : (
                     <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-center font-semibold">
                        Nenhum defeito registrado. Operação segura.
                     </div>
                   )}
                 </div>
              </div>

              {selected.generalObservations && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                   <h4 className="font-bold text-amber-800 text-sm mb-1 uppercase tracking-wider">Observações do Motorista</h4>
                   <p className="text-amber-900 text-sm">{selected.generalObservations}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
               <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
               <p>Selecione uma inspeção para visualizar os detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;


import React, { useState } from 'react';
import { User, ChecklistSubmission, ItemStatus, ChecklistSection } from '../types';
import { INITIAL_CHECKLIST_DATA } from '../constants';

interface ChecklistFormProps {
  user: User;
  onSubmit: (data: ChecklistSubmission) => void;
  onCancel: () => void;
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({ user, onSubmit, onCancel }) => {
  const [step, setStep] = useState(0); // 0: Header, 1-N: Sections, N+1: Review
  const [prefix, setPrefix] = useState('');
  const [km, setKm] = useState<number>(0);
  const [hourmeter, setHourmeter] = useState('');
  const [shift, setShift] = useState<'Day' | 'Night'>('Day');
  const [sections, setSections] = useState<ChecklistSection[]>(INITIAL_CHECKLIST_DATA);
  const [observations, setObservations] = useState('');

  const handleStatusChange = (sectionIdx: number, itemIdx: number, status: ItemStatus) => {
    const newSections = [...sections];
    newSections[sectionIdx].items[itemIdx].status = status;
    setSections(newSections);
  };

  const handleSurveyChange = (sectionIdx: number, itemIdx: number, surveyed: boolean) => {
    const newSections = [...sections];
    newSections[sectionIdx].items[itemIdx].surveyed = surveyed;
    setSections(newSections);
  };

  const handleObsChange = (sectionIdx: number, itemIdx: number, obs: string) => {
    const newSections = [...sections];
    newSections[sectionIdx].items[itemIdx].observations = obs;
    setSections(newSections);
  };

  const currentSection = sections[step - 1];
  const isHeaderValid = prefix && km > 0 && hourmeter;

  const handleSubmit = () => {
    const submission: ChecklistSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('pt-BR'),
      shift,
      driverId: user.id,
      driverName: user.name,
      prefix,
      km,
      hourmeter,
      departureTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      sections,
      generalObservations: observations
    };
    onSubmit(submission);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header Info */}
      <div className="mb-6 bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-800">Novo Checklist de Inspeção</h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">
            PASSO {step + 1} DE {sections.length + 1}
          </span>
        </div>
        
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prefixo do Veículo</label>
              <input 
                value={prefix} onChange={e => setPrefix(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg" placeholder="Ex: 5020"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quilometragem (KM)</label>
              <input 
                type="number" value={km} onChange={e => setKm(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Horímetro</label>
              <input 
                value={hourmeter} onChange={e => setHourmeter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg" placeholder="Ex: 12450h"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
              <select 
                value={shift} onChange={e => setShift(e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="Day">Diurno</option>
                <option value="Night">Noturno</option>
              </select>
            </div>
          </div>
        )}

        {step > 0 && step <= sections.length && (
          <div className="space-y-4">
            <h3 className="font-bold text-emerald-700 border-b pb-2 uppercase tracking-wide">
              {currentSection.title}
            </h3>
            <div className="divide-y max-h-[60vh] overflow-y-auto pr-2 hide-scrollbar">
              {currentSection.items.map((item, idx) => (
                <div key={item.id} className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <p className="font-medium text-slate-700 flex-1">{item.id}. {item.label}</p>
                    <div className="flex gap-1">
                      {[ItemStatus.OK, ItemStatus.MISSING, ItemStatus.DEFECTIVE].map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(step - 1, idx, s)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            item.status === s 
                              ? (s === ItemStatus.OK ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-red-500 text-white border-red-600')
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={item.surveyed}
                          onChange={e => handleSurveyChange(step - 1, idx, e.target.checked)}
                          className="w-4 h-4 accent-emerald-600"
                        />
                        Vistoria Realizada?
                     </label>
                     <input 
                       placeholder="Observações..."
                       className="flex-1 text-sm border-b focus:border-emerald-500 outline-none transition-colors"
                       value={item.observations || ''}
                       onChange={e => handleObsChange(step - 1, idx, e.target.value)}
                     />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step > sections.length && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">Revisão Final</h3>
            <p className="text-sm text-slate-500">Confirme todos os dados antes de enviar para o sistema operacional.</p>
            <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
              <p><strong>Veículo:</strong> {prefix}</p>
              <p><strong>KM:</strong> {km}</p>
              <p><strong>Motorista:</strong> {user.name}</p>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Observações Gerais</label>
               <textarea 
                 className="w-full p-3 border rounded-xl h-32"
                 value={observations}
                 onChange={e => setObservations(e.target.value)}
                 placeholder="Alguma intercorrência geral durante a vistoria?"
               ></textarea>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex gap-3">
        <button 
          onClick={onCancel}
          className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors font-semibold"
        >
          Cancelar
        </button>
        <div className="flex-1"></div>
        {step > 0 && (
          <button 
            onClick={() => setStep(step - 1)}
            className="px-6 py-3 bg-slate-200 rounded-xl text-slate-700 hover:bg-slate-300 transition-colors font-semibold"
          >
            Anterior
          </button>
        )}
        {step <= sections.length ? (
          <button 
            disabled={step === 0 && !isHeaderValid}
            onClick={() => setStep(step + 1)}
            className="px-8 py-3 bg-emerald-600 rounded-xl text-white font-bold shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {step === 0 ? 'Iniciar Checklist' : 'Próximo'}
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            className="px-8 py-3 bg-emerald-600 rounded-xl text-white font-bold shadow-lg hover:bg-emerald-700 transition-all"
          >
            Finalizar e Enviar
          </button>
        )}
      </div>
    </div>
  );
};

export default ChecklistForm;


import React, { useState, useMemo, useEffect } from 'react';
import { User, Vehicle, DBChecklistItem, ChecklistEntry, ItemStatus } from '../types';

interface ChecklistFormProps {
  user: User;
  vehicles: Vehicle[];
  availableItems: DBChecklistItem[];
  onSubmit: (entry: ChecklistEntry) => void;
  onCancel: () => void;
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({ user, vehicles, availableItems, onSubmit, onCancel }) => {
  const [step, setStep] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [type, setType] = useState<'Saída' | 'Retorno'>('Saída');
  const [km, setKm] = useState(0);
  const [horimetro, setHorimetro] = useState(0);
  const [shift, setShift] = useState('Diurno');
  const [itemResponses, setItemResponses] = useState<Record<string, { status: ItemStatus | null; observations?: string; surveyed: boolean }>>({});
  const [generalObs, setGeneralObs] = useState('');

  const activeVehicles = useMemo(() => vehicles.filter(v => v.active !== false), [vehicles]);

  useEffect(() => {
    if (availableItems.length > 0 && Object.keys(itemResponses).length === 0) {
      const initial: Record<string, any> = {};
      availableItems.forEach(item => {
        // Agora iniciamos com status null para obrigar o clique
        initial[item.id] = { status: null, surveyed: true, observations: '' };
      });
      setItemResponses(initial);
    }
  }, [availableItems]);

  const categories = useMemo(() => {
    const cats: Record<string, DBChecklistItem[]> = {};
    availableItems.forEach(item => {
      if (!cats[item.category]) cats[item.category] = [];
      cats[item.category].push(item);
    });
    return Object.entries(cats);
  }, [availableItems]);

  const handleStatusChange = (itemId: number, status: ItemStatus) => {
    setItemResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status, surveyed: true }
    }));
  };

  const handleItemObs = (itemId: number, obs: string) => {
    setItemResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], observations: obs }
    }));
  };

  const isKmValid = selectedVehicle ? km >= selectedVehicle.current_km : true;
  const isHorimetroValid = selectedVehicle ? horimetro >= selectedVehicle.current_horimetro : true;
  const isStep0Valid = selectedVehicle && km > 0 && horimetro > 0 && isKmValid && isHorimetroValid;

  // Validação se todos os itens da categoria atual foram respondidos
  const isCurrentCategoryComplete = useMemo(() => {
    if (step === 0) return isStep0Valid;
    if (step > categories.length) return true;
    
    const currentItems = categories[step - 1][1];
    return currentItems.every(item => itemResponses[item.id]?.status !== null);
  }, [step, categories, itemResponses, isStep0Valid]);

  const handleNext = () => {
    if (!isCurrentCategoryComplete) {
      alert("Atenção: Todos os itens desta seção devem ser preenchidos antes de avançar.");
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = () => {
    const hasIssues = Object.values(itemResponses).some(r => r.status !== ItemStatus.OK);

    const entry: ChecklistEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      shift,
      type,
      driver_name: user.name,
      prefix: selectedVehicle!.prefix,
      vehicle_id: selectedVehicle!.id,
      km,
      horimetro,
      items: itemResponses as any,
      general_observations: generalObs,
      created_at: Date.now(),
      user_id: user.id,
      has_issues: hasIssues,
      maintenance_checked: false,
      operation_checked: false
    };

    onSubmit(entry);
  };

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Checklist de {type}</h2>
            <p className="text-slate-400 text-sm">Itens marcados com * são obrigatórios</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Passo</span>
            <span className="text-lg font-black text-slate-800">
              {step === 0 ? 'INÍCIO' : `${step}/${categories.length + 1}`}
            </span>
          </div>
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">Operação *</label>
              <select className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-semibold" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="Saída">Saída de Veículo</option>
                <option value="Retorno">Retorno de Veículo</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">Turno *</label>
              <select className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-semibold" value={shift} onChange={e => setShift(e.target.value)}>
                <option value="Diurno">Diurno</option>
                <option value="Noturno">Noturno</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">Veículo (Prefixo) *</label>
              <select 
                className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-semibold" 
                onChange={e => {
                  const v = vehicles.find(v => v.id === e.target.value);
                  if (v) {
                    setSelectedVehicle(v);
                    setKm(v.current_km);
                    setHorimetro(v.current_horimetro);
                  }
                }}
              >
                <option value="">Selecione o prefixo...</option>
                {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.prefix} - Placa: {v.plate}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase flex justify-between">
                <span>KM do Painel *</span>
                {selectedVehicle && <span className="text-[9px] text-emerald-600">Mín: {selectedVehicle.current_km}</span>}
              </label>
              <input 
                type="number" 
                className={`w-full p-4 bg-slate-50 border-2 rounded-2xl font-semibold transition-colors ${!isKmValid ? 'border-red-400 bg-red-50 text-red-700' : 'border-transparent'}`} 
                value={km} 
                onChange={e => setKm(Number(e.target.value))} 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase flex justify-between">
                <span>Horímetro *</span>
                {selectedVehicle && <span className="text-[9px] text-emerald-600">Mín: {selectedVehicle.current_horimetro}</span>}
              </label>
              <input 
                type="number" 
                className={`w-full p-4 bg-slate-50 border-2 rounded-2xl font-semibold transition-colors ${!isHorimetroValid ? 'border-red-400 bg-red-50 text-red-700' : 'border-transparent'}`} 
                value={horimetro} 
                onChange={e => setHorimetro(Number(e.target.value))} 
              />
            </div>
          </div>
        )}

        {step > 0 && step <= categories.length && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className="font-black text-xl text-emerald-700 border-b-2 border-emerald-50 pb-4 uppercase tracking-tight">
              {categories[step-1][0]}
            </h3>
            <div className="divide-y divide-slate-50">
              {categories[step-1][1].map(item => (
                <div key={item.id} className="py-6 first:pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <p className="font-bold text-slate-700 flex-1">
                      {item.label} <span className="text-red-500">*</span>
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {Object.values(ItemStatus).map(s => (
                        <button 
                          key={s}
                          onClick={() => handleStatusChange(item.id, s)}
                          className={`flex-1 py-3 text-[10px] font-black rounded-xl border-2 transition-all ${itemResponses[item.id]?.status === s ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}
                        >{s}</button>
                      ))}
                    </div>
                    {itemResponses[item.id]?.status && itemResponses[item.id]?.status !== ItemStatus.OK && (
                      <input 
                        value={itemResponses[item.id]?.observations || ''}
                        placeholder={`Descreva o motivo da ${itemResponses[item.id]?.status}...`} 
                        className="w-full p-3 bg-red-50 border-0 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200"
                        onChange={e => handleItemObs(item.id, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step > categories.length && (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-black text-xl text-slate-800">Observações Finais</h3>
            <p className="text-slate-400 text-sm">Registre aqui qualquer detalhe adicional.</p>
            <textarea 
              className="w-full p-5 bg-slate-50 border-0 rounded-3xl h-48 font-medium focus:ring-2 focus:ring-emerald-200 outline-none" 
              value={generalObs} 
              onChange={e => setGeneralObs(e.target.value)}
              placeholder="Ex: Pneu traseiro direito com desgaste..."
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="px-8 py-5 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancelar</button>
        <div className="flex-1"></div>
        {step > 0 && <button onClick={() => setStep(step - 1)} className="px-8 py-5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Voltar</button>}
        {step <= categories.length ? (
          <button 
            onClick={handleNext} 
            className={`px-12 py-5 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-100 transition-all ${!isCurrentCategoryComplete ? 'opacity-50 cursor-not-allowed bg-slate-400' : 'hover:bg-emerald-700'}`}
          >
            Próximo
          </button>
        ) : (
          <button onClick={handleSubmit} className="px-12 py-5 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">Finalizar Checklist</button>
        )}
      </div>
    </div>
  );
};

export default ChecklistForm;


import React, { useState, useMemo } from 'react';
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
  const [itemResponses, setItemResponses] = useState<Record<string, any>>({});
  const [generalObs, setGeneralObs] = useState('');

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
      [itemId]: { ...(prev[itemId] || {}), status, surveyed: true }
    }));
  };

  const handleItemObs = (itemId: number, obs: string) => {
    setItemResponses(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), observations: obs }
    }));
  };

  const isFormValid = selectedVehicle && km > 0 && horimetro > 0;

  const handleSubmit = () => {
    if (!selectedVehicle) return;
    
    const hasIssues = Object.values(itemResponses).some(r => r.status !== ItemStatus.OK);

    const entry: ChecklistEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      shift,
      type,
      driver_name: user.name,
      prefix: selectedVehicle.prefix,
      vehicle_id: selectedVehicle.id,
      km,
      horimetro,
      items: itemResponses,
      general_observations: generalObs,
      created_at: Date.now(),
      user_id: user.id,
      has_issues: hasIssues
    };

    onSubmit(entry);
  };

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Nova Vistoria: {type}</h2>
          <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
            {step === 0 ? 'IDENTIFICAÇÃO' : `GRUPO ${step} DE ${categories.length}`}
          </span>
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select className="w-full p-2 border rounded-lg" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="Saída">Saída</option>
                <option value="Retorno">Retorno</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Veículo (Prefixo)</label>
              <select 
                className="w-full p-2 border rounded-lg" 
                onChange={e => {
                  const v = vehicles.find(v => v.id === e.target.value);
                  if (v) {
                    setSelectedVehicle(v);
                    setKm(v.current_km);
                    setHorimetro(v.current_horimetro);
                  }
                }}
              >
                <option value="">Selecione...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.prefix} ({v.plate})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KM Atual</label>
              <input type="number" className="w-full p-2 border rounded-lg" value={km} onChange={e => setKm(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Horímetro Atual</label>
              <input type="number" className="w-full p-2 border rounded-lg" value={horimetro} onChange={e => setHorimetro(Number(e.target.value))} />
            </div>
          </div>
        )}

        {step > 0 && step <= categories.length && (
          <div className="space-y-4">
            <h3 className="font-bold text-emerald-700 border-b pb-2 uppercase">{categories[step-1][0]}</h3>
            <div className="divide-y max-h-[50vh] overflow-y-auto pr-2">
              {categories[step-1][1].map(item => (
                <div key={item.id} className="py-4">
                  <p className="font-medium text-slate-700 mb-2">{item.label}</p>
                  <div className="flex gap-2 mb-2">
                    {Object.values(ItemStatus).map(s => (
                      <button 
                        key={s}
                        onClick={() => handleStatusChange(item.id, s)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-full border ${itemResponses[item.id]?.status === s ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-400'}`}
                      >{s}</button>
                    ))}
                  </div>
                  <input 
                    placeholder="Observação específica..." 
                    className="w-full text-xs border-b outline-none focus:border-emerald-500"
                    onChange={e => handleItemObs(item.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step > categories.length && (
          <div className="space-y-4">
            <h3 className="font-bold">Observações Gerais</h3>
            <textarea 
              className="w-full p-3 border rounded-xl h-32" 
              value={generalObs} 
              onChange={e => setGeneralObs(e.target.value)}
              placeholder="Descreva problemas mecânicos ou observações da rota..."
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="px-6 py-3 border rounded-xl font-semibold">Cancelar</button>
        <div className="flex-1"></div>
        {step > 0 && <button onClick={() => setStep(step - 1)} className="px-6 py-3 bg-slate-200 rounded-xl font-semibold">Voltar</button>}
        {step <= categories.length ? (
          <button disabled={step === 0 && !isFormValid} onClick={() => setStep(step + 1)} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50">Próximo</button>
        ) : (
          <button onClick={handleSubmit} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg">Finalizar</button>
        )}
      </div>
    </div>
  );
};

export default ChecklistForm;

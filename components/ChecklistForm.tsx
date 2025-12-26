
import React, { useState, useMemo, useEffect } from 'react';
import { User, Vehicle, DBChecklistItem, ChecklistEntry, ItemStatus } from '../types';
import { supabase } from '../lib/supabase';
import { OFFICIAL_SOLURB_ITEMS } from '../constants';

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
  const [itemResponses, setItemResponses] = useState<Record<number, { status: ItemStatus | null; observations?: string; surveyed: boolean }>>({});
  const [generalObs, setGeneralObs] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  
  const [lastSaida, setLastSaida] = useState<ChecklistEntry | null>(null);
  const [divergenceItems, setDivergenceItems] = useState<number[]>([]);

  // Garantia total de que trabalhamos apenas com itens 1-48
  const validAvailableItems = useMemo(() => 
    OFFICIAL_SOLURB_ITEMS.filter(item => item.id <= 48),
    []
  );

  const activeVehicles = useMemo(() => vehicles.filter(v => v.active !== false), [vehicles]);

  useEffect(() => {
    if (Object.keys(itemResponses).length === 0) {
      const initial: Record<number, any> = {};
      validAvailableItems.sort((a,b) => a.id - b.id).forEach(item => {
        initial[item.id] = { status: null, surveyed: true, observations: '' };
      });
      setItemResponses(initial);
    }
  }, [validAvailableItems, itemResponses]);

  useEffect(() => {
    const fetchLastSaida = async () => {
      if (type === 'Retorno' && selectedVehicle) {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('entries')
          .select('*')
          .eq('vehicle_id', selectedVehicle.id)
          .eq('type', 'Saída')
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        setLastSaida(data as ChecklistEntry);
      } else {
        setLastSaida(null);
      }
    };
    fetchLastSaida();
  }, [type, selectedVehicle]);

  const stage1Items = useMemo(() => {
    const cats = ['MOTOR (VEÍCULO DESLIGADO)', 'CABINE INTERNA/EXTERNA', 'BAÚ', 'GERAL'];
    const grouped: Record<string, any[]> = {};
    validAvailableItems.filter(i => cats.includes(i.category)).sort((a,b) => a.id - b.id).forEach(i => {
      if (!grouped[i.category]) grouped[i.category] = [];
      grouped[i.category].push(i);
    });
    return grouped;
  }, [validAvailableItems]);

  const stage2Items = useMemo(() => {
    const cats = ['VERIFICAR FUNCIONAMENTO'];
    const grouped: Record<string, any[]> = {};
    validAvailableItems.filter(i => cats.includes(i.category)).sort((a,b) => a.id - b.id).forEach(i => {
      if (!grouped[i.category]) grouped[i.category] = [];
      grouped[i.category].push(i);
    });
    return grouped;
  }, [validAvailableItems]);

  const handleStatusChange = (itemId: number, status: ItemStatus) => {
    setItemResponses(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] as any), status, surveyed: true }
    }));

    if (lastSaida) {
      const previousItem = (lastSaida.items as any)[itemId.toString()];
      const saidaStatus = previousItem?.status;
      if (saidaStatus === ItemStatus.OK && status !== ItemStatus.OK) {
        if (!divergenceItems.includes(itemId)) {
          setDivergenceItems(prev => [...prev, itemId]);
        }
      } else {
        setDivergenceItems(prev => prev.filter(id => id !== itemId));
      }
    }
  };

  const isStep0Valid = selectedVehicle && km > 0 && horimetro > 0 && km >= selectedVehicle.current_km && horimetro >= selectedVehicle.current_horimetro;

  const handleNext = () => {
    if (step === 0 && !isStep0Valid) {
      alert("Preencha KM e Horímetro corretamente.");
      return;
    }
    if (step === 1) {
      const allS1 = Object.values(stage1Items).flat();
      // Fix: cast i to any to resolve 'id' property error
      if (!allS1.every((i: any) => (itemResponses[i.id] as any)?.status !== null)) {
        alert("Preencha todos os itens do Veículo Desligado.");
        return;
      }
    }
    if (step === 2) {
      const allS2 = Object.values(stage2Items).flat();
      // Fix: cast i to any to resolve 'id' property error
      if (!allS2.every((i: any) => (itemResponses[i.id] as any)?.status !== null)) {
        alert("Preencha todos os itens do Veículo em Funcionamento.");
        return;
      }
    }
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = () => {
    if (!isSigned) {
      alert("Você precisa assinar o checklist antes de finalizar.");
      return;
    }

    const filteredResponses: Record<string, any> = {};
    Object.entries(itemResponses).forEach(([id, data]) => {
      if (parseInt(id) <= 48) {
        filteredResponses[id] = data;
      }
    });

    const hasIssues = Object.values(filteredResponses).some((r: any) => r.status !== ItemStatus.OK);
    const hasDivergence = divergenceItems.some(id => id <= 48);
    
    let divergenceDetails = '';
    if (hasDivergence) {
      divergenceDetails = divergenceItems
        .filter(id => id <= 48)
        .map(id => {
          const item = OFFICIAL_SOLURB_ITEMS.find(i => i.id === id);
          return item ? `${item.label}` : `Item ${id}`;
        }).join(', ');
    }

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
      items: filteredResponses,
      general_observations: generalObs,
      created_at: Date.now(),
      user_id: user.id,
      has_issues: hasIssues,
      has_divergence: hasDivergence,
      divergence_details: divergenceDetails,
      maintenance_checked: false,
      operation_checked: false
    };

    onSubmit(entry);
  };

  const renderItemRow = (item: any) => {
    const isDivergent = divergenceItems.includes(item.id);
    const response = itemResponses[item.id];

    return (
      <div key={item.id} className={`py-5 border-b border-slate-50 last:border-0 transition-all ${isDivergent ? 'bg-red-50 -mx-4 px-4 rounded-xl' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <p className="font-bold text-slate-700 text-sm flex-1">{item.label} <span className="text-red-500">*</span></p>
          {isDivergent && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase animate-pulse">Divergência</span>}
        </div>
        <div className="flex gap-2">
          {Object.values(ItemStatus).map(s => (
            <button 
              key={s}
              onClick={() => handleStatusChange(item.id, s)}
              className={`flex-1 py-3 text-[10px] font-black rounded-xl border-2 transition-all ${response?.status === s ? (s === ItemStatus.OK ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : (s === ItemStatus.DEFECTIVE ? 'bg-red-50 border-red-600 text-red-700' : 'bg-orange-50 border-orange-600 text-orange-700')) : 'bg-white border-slate-100 text-slate-400'}`}
            >{s}</button>
          ))}
        </div>
        {response?.status && response.status !== ItemStatus.OK && (
          <input 
            value={response.observations || ''}
            placeholder="Observação do defeito/falta..." 
            className="w-full mt-2 p-3 bg-red-50 border-0 rounded-xl text-xs font-bold text-red-700 placeholder:text-red-300 outline-none"
            onChange={e => setItemResponses(prev => ({...prev, [item.id]: {...(prev[item.id] as any), observations: e.target.value}}))}
          />
        )}
      </div>
    );
  };

  const issueItems = useMemo(() => {
    return Object.entries(itemResponses)
      .filter(([id, data]) => parseInt(id) <= 48 && (data as any).status && (data as any).status !== ItemStatus.OK)
      .map(([id, data]) => {
        const itemInfo = OFFICIAL_SOLURB_ITEMS.find(i => i.id.toString() === id);
        return {
          label: itemInfo?.label || `Item ${id}`,
          status: (data as any).status,
          obs: (data as any).observations
        };
      });
  }, [itemResponses]);

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex gap-2 mb-8 px-4 sm:px-0">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-emerald-600 shadow-sm' : 'bg-slate-200'}`}></div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 sm:p-10 mb-8">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {step === 0 && 'Informações Iniciais'}
              {step === 1 && 'Etapa 1: Veículo Desligado'}
              {step === 2 && 'Etapa 2: Veículo em Funcionamento'}
              {step === 3 && 'Finalização e Assinatura'}
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              {step === 3 ? 'Confirme as pendências e assine' : 'Preencha todos os itens obrigatórios'}
            </p>
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-2xl">
            <span className="text-xs font-black text-emerald-700">{step}/3</span>
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Operação</label>
                  <select className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700" value={type} onChange={e => setType(e.target.value as any)}>
                    <option value="Saída">Saída</option>
                    <option value="Retorno">Retorno</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno</label>
                  <select className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700" value={shift} onChange={e => setShift(e.target.value)}>
                    <option value="Diurno">Diurno</option>
                    <option value="Noturno">Noturno</option>
                  </select>
                </div>
             </div>

             <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Veículo Solurb</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700"
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
                  {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
                </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">KM Atual</label>
                  <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={km} onChange={e => setKm(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Horímetro</label>
                  <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={horimetro} onChange={e => setHorimetro(Number(e.target.value))} />
                </div>
             </div>
          </div>
        )}

        {(step === 1 || step === 2) && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            {/* Fix: cast Object.entries result to [string, any[]][] to ensure map exists */}
            {(Object.entries(step === 1 ? stage1Items : stage2Items) as [string, any[]][]).map(([cat, items]) => (
              <div key={cat} className="space-y-4">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50 px-4 py-2 rounded-lg inline-block">{cat}</h3>
                <div className="space-y-2">
                  {items.map(renderItemRow)}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in zoom-in-95">
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendências Identificadas</h4>
                {issueItems.length > 0 ? (
                  <div className="bg-red-50 rounded-3xl p-6 border border-red-100 space-y-3">
                    {issueItems.map((issue, idx) => (
                      <div key={idx} className="flex flex-col border-b border-red-100 last:border-0 pb-2 last:pb-0">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">{issue.label}</span>
                          <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${issue.status === ItemStatus.DEFECTIVE ? 'bg-red-600' : 'bg-orange-500'} text-white`}>{issue.status}</span>
                        </div>
                        {issue.obs && <p className="text-[10px] text-red-500 font-medium mt-1 italic">Obs: {issue.obs}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">Tudo OK! Nenhuma irregularidade detectada.</span>
                  </div>
                )}
             </div>

             <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Finais</label>
                <textarea 
                  className="w-full p-5 bg-slate-50 border-0 rounded-[2rem] h-32 font-medium focus:ring-2 focus:ring-emerald-200 outline-none"
                  value={generalObs}
                  onChange={e => setGeneralObs(e.target.value)}
                  placeholder="Relate aqui qualquer detalhe adicional importante..."
                />
             </div>

             <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${isSigned ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'}`}>
                  {isSigned ? (
                    <div className="text-center">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Documento Assinado Eletronicamente por</p>
                       <p className="text-xl font-black">{user.name}</p>
                       <p className="text-xs font-bold opacity-80">Matrícula: {user.matricula}</p>
                       <button onClick={() => setIsSigned(false)} className="mt-4 text-[10px] font-black uppercase underline">Refazer Assinatura</button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                       <p className="text-xs font-bold px-4">Eu, <span className="text-slate-800">{user.name}</span>, declaro que as informações acima são verdadeiras.</p>
                       <button 
                        onClick={() => setIsSigned(true)}
                        className="bg-white text-slate-800 px-8 py-3 rounded-xl font-black text-xs shadow-lg hover:bg-slate-100 transition-all flex items-center gap-2 mx-auto"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                         ASSINAR DOCUMENTO
                       </button>
                    </div>
                  )}
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button onClick={onCancel} className="px-6 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancelar</button>
        <div className="flex-1"></div>
        {step > 0 && <button onClick={() => setStep(step - 1)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200">Voltar</button>}
        {step < 3 ? (
          <button onClick={handleNext} className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">Continuar</button>
        ) : (
          <button 
            onClick={handleSubmit} 
            disabled={!isSigned}
            className={`px-12 py-4 rounded-2xl font-black shadow-xl transition-all ${isSigned ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            Finalizar e Enviar
          </button>
        )}
      </div>
    </div>
  );
};

export default ChecklistForm;

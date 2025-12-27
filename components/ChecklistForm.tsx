
import React, { useState, useMemo, useEffect } from 'react';
import { User, Vehicle, DBChecklistItem, ChecklistEntry, ItemStatus } from '../types';
import { supabase } from '../lib/supabase';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para o alerta customizado centralizado
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const [lastSaida, setLastSaida] = useState<ChecklistEntry | null>(null);
  const [divergenceItems, setDivergenceItems] = useState<number[]>([]);

  const validAvailableItems = useMemo(() => {
    return availableItems.filter(item => item.active !== false);
  }, [availableItems]);

  const activeVehicles = useMemo(() => vehicles.filter(v => v.active !== false), [vehicles]);

  useEffect(() => {
    if (validAvailableItems.length > 0) {
      setItemResponses(prev => {
        const next = { ...prev };
        let hasChanges = false;
        validAvailableItems.forEach(item => {
          if (!next[item.id]) {
            next[item.id] = { status: null, surveyed: true, observations: '' };
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }
  }, [validAvailableItems]);

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

  const stage1Items = useMemo<Record<string, DBChecklistItem[]>>(() => {
    const grouped: Record<string, DBChecklistItem[]> = {};
    validAvailableItems
      .filter(i => {
        const cat = (i.category || '').toUpperCase();
        return !cat.includes('FUNCIONAMENTO');
      })
      .sort((a,b) => a.id - b.id)
      .forEach(i => {
        const catName = i.category || 'GERAL';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(i);
      });
    return grouped;
  }, [validAvailableItems]);

  const stage2Items = useMemo<Record<string, DBChecklistItem[]>>(() => {
    const grouped: Record<string, DBChecklistItem[]> = {};
    validAvailableItems
      .filter(i => {
        const cat = (i.category || '').toUpperCase();
        return cat.includes('FUNCIONAMENTO');
      })
      .sort((a,b) => a.id - b.id)
      .forEach(i => {
        const catName = i.category || 'VERIFICAR FUNCIONAMENTO';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(i);
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

  const triggerAlert = (msg: string) => {
    setAlertMessage(msg);
    setShowAlert(true);
  };

  const handleNext = () => {
    if (step === 0) {
      if (!selectedVehicle) {
        triggerAlert("POR FAVOR, SELECIONE O VEÍCULO ANTES DE CONTINUAR.");
        return;
      }
      if (km < selectedVehicle.current_km) {
        triggerAlert("O KM INFORMADO NÃO PODE SER INFERIOR AO REGISTRADO NO SISTEMA.");
        return;
      }
      if (horimetro < selectedVehicle.current_horimetro) {
        triggerAlert("O HORÍMETRO INFORMADO NÃO PODE SER INFERIOR AO REGISTRADO NO SISTEMA.");
        return;
      }
    }

    if (step === 1) {
      const allS1 = Object.values(stage1Items).flat() as DBChecklistItem[];
      const unanswered = allS1.filter(i => !itemResponses[i.id]?.status);
      if (unanswered.length > 0) {
        triggerAlert("POSSUI ITENS PENDENTES DE PREENCHIMENTO");
        return;
      }
    }

    if (step === 2) {
      const allS2 = Object.values(stage2Items).flat() as DBChecklistItem[];
      const unanswered = allS2.filter(i => !itemResponses[i.id]?.status);
      if (unanswered.length > 0) {
        triggerAlert("POSSUI ITENS PENDENTES DE PREENCHIMENTO");
        return;
      }
    }

    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!isSigned) {
      triggerAlert("VOCÊ PRECISA ASSINAR A VISTORIA ANTES DE FINALIZAR.");
      return;
    }

    setIsSubmitting(true);
    try {
      const filteredResponses: Record<string, any> = {};
      Object.entries(itemResponses).forEach(([id, data]) => {
        filteredResponses[id] = data;
      });

      const hasDefects = Object.values(filteredResponses).some((r: any) => r.status === ItemStatus.DEFECTIVE);
      const hasMissing = Object.values(filteredResponses).some((r: any) => r.status === ItemStatus.MISSING);
      const hasDivergence = divergenceItems.length > 0;
      
      let divergenceDetails = '';
      if (hasDivergence) {
        divergenceDetails = divergenceItems
          .map(id => {
            const item = validAvailableItems.find(i => i.id === id);
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
        has_issues: hasDefects || hasMissing || hasDivergence,
        has_divergence: hasDivergence,
        divergence_details: divergenceDetails,
        maintenance_checked: !hasDefects && !hasDivergence,
        maintenance_user_id: undefined, 
        operation_checked: !hasMissing,
        operation_user_id: undefined
      };

      await onSubmit(entry);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const issuesSummary = useMemo(() => {
    return Object.entries(itemResponses)
      .filter(([id, data]) => (data as any).status && (data as any).status !== ItemStatus.OK)
      .map(([id, data]) => {
        const itemInfo = validAvailableItems.find(i => i.id.toString() === id);
        return {
          id,
          label: itemInfo?.label || `Item ${id}`,
          status: (data as any).status
        };
      });
  }, [itemResponses, validAvailableItems]);

  const renderItemRow = (item: DBChecklistItem) => {
    const isDivergent = divergenceItems.includes(item.id);
    const response = itemResponses[item.id];

    return (
      <div key={item.id} className={`py-5 border-b border-slate-50 last:border-0 transition-all ${isDivergent ? 'bg-red-50 -mx-4 px-4 rounded-xl' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-start gap-2 flex-1">
             <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded shrink-0 mt-0.5">#{item.id}</span>
             <p className="font-bold text-slate-700 text-sm leading-tight">{item.label} <span className="text-red-500">*</span></p>
          </div>
          {isDivergent && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase">Divergência</span>}
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
            placeholder="Relate o motivo aqui..." 
            className="w-full mt-2 p-3 bg-red-50 border-0 rounded-xl text-xs font-bold text-red-700 outline-none"
            onChange={e => setItemResponses(prev => ({...prev, [item.id]: {...(prev[item.id] as any), observations: e.target.value}}))}
          />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 relative">
      {/* Alerta Customizado Centralizado */}
      {showAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 uppercase">Atenção</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{alertMessage}</p>
             </div>
             <button 
              onClick={() => setShowAlert(false)}
              className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-transform"
             >
               ENTENDI, VOU REVISAR
             </button>
          </div>
        </div>
      )}

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
              {step === 3 && 'Resumo e Assinatura'}
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              {step === 3 ? 'Confirme as pendências e assine' : 'Preencha todos os itens obrigatoriamente'}
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
                  <option value="">Selecione o prefixo...</option>
                  {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
                </select>
                {selectedVehicle && (
                  <div className="flex gap-4 px-2 mt-1">
                    <p className="text-[10px] font-black text-emerald-600 uppercase">KM Registrado: {selectedVehicle.current_km}</p>
                    <p className="text-[10px] font-black text-emerald-600 uppercase">Horímetro Registrado: {selectedVehicle.current_horimetro}</p>
                  </div>
                )}
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

        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            {Object.keys(stage1Items).map((cat) => (
              <div key={cat} className="space-y-4">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50 px-4 py-2 rounded-lg inline-block">{cat}</h3>
                <div className="space-y-2">
                  {stage1Items[cat].map(renderItemRow)}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            {Object.keys(stage2Items).map((cat) => (
              <div key={cat} className="space-y-4">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50 px-4 py-2 rounded-lg inline-block">{cat}</h3>
                <div className="space-y-2">
                  {stage2Items[cat].map(renderItemRow)}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in zoom-in-95">
             {/* Resumo de Irregularidades */}
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resumo de Irregularidades</h4>
                {issuesSummary.length > 0 ? (
                  <div className="bg-red-50 rounded-[2rem] p-6 border border-red-100 space-y-3">
                    {issuesSummary.map(issue => (
                      <div key={issue.id} className="flex items-center justify-between border-b border-red-100 last:border-0 pb-2 last:pb-0">
                        <span className="text-xs font-bold text-slate-700">#{issue.id} {issue.label}</span>
                        <span className={`text-[8px] font-black px-2 py-1 rounded text-white ${issue.status === ItemStatus.DEFECTIVE ? 'bg-red-600' : 'bg-orange-500'}`}>{issue.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100 text-center">
                    <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Tudo OK!</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Nenhuma irregularidade apontada.</p>
                  </div>
                )}
             </div>

             <div className="pt-6 border-t border-slate-100 space-y-4 text-center">
                <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${isSigned ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-100' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'}`}>
                  {isSigned ? (
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Checklist assinado por</p>
                       <p className="text-2xl font-black">{user.name}</p>
                       <button onClick={() => setIsSigned(false)} className="mt-4 text-[10px] font-black uppercase underline">Refazer assinatura</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <p className="text-sm font-bold text-slate-600 leading-relaxed px-4">Eu, <span className="text-slate-900 font-black">{user.name}</span>, confirmo que realizei a vistoria e os dados acima são verdadeiros.</p>
                       <button onClick={() => setIsSigned(true)} className="bg-white text-slate-800 px-10 py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-slate-100 transition-all flex items-center gap-2 mx-auto active:scale-95">CONFIRMAR E ASSINAR</button>
                    </div>
                  )}
                </div>
             </div>

             <textarea 
                className="w-full p-5 bg-slate-50 border-0 rounded-[2rem] h-24 font-medium outline-none"
                value={generalObs}
                onChange={e => setGeneralObs(e.target.value)}
                placeholder="Observações adicionais..."
             />
          </div>
        )}
      </div>

      <div className="flex gap-4 px-4 sm:px-0">
        <button onClick={onCancel} className="px-6 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancelar</button>
        <div className="flex-1"></div>
        {step > 0 && <button onClick={() => setStep(step - 1)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Voltar</button>}
        {step < 3 ? (
          <button onClick={handleNext} className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">Continuar</button>
        ) : (
          <button 
            onClick={handleSubmit} 
            disabled={!isSigned || isSubmitting}
            className={`px-12 py-4 rounded-2xl font-black shadow-xl transition-all ${isSigned && !isSubmitting ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isSubmitting ? 'Salvando...' : 'Finalizar e Enviar'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChecklistForm;

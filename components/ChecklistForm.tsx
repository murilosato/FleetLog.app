
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
      <div key={item.id} className={`py-6 border-b border-slate-50 last:border-0 transition-all ${isDivergent ? 'bg-red-50/50 -mx-4 px-4 rounded-3xl' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1">
             <p className="font-black text-[#0A2540] text-sm leading-tight">{item.label} <span className="text-red-500">*</span></p>
          </div>
          {isDivergent && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-lg font-black uppercase tracking-widest">Divergência</span>}
        </div>
        <div className="flex gap-2">
          {Object.values(ItemStatus).map(s => (
            <button 
              key={s}
              onClick={() => handleStatusChange(item.id, s)}
              className={`flex-1 py-3 text-[10px] font-black rounded-2xl border-2 transition-all ${response?.status === s ? (s === ItemStatus.OK ? 'bg-[#58CC02] border-[#58CC02] text-white shadow-lg' : (s === ItemStatus.DEFECTIVE ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-orange-500 border-orange-500 text-white shadow-lg')) : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
            >{s}</button>
          ))}
        </div>
        {response?.status && response.status !== ItemStatus.OK && (
          <input 
            value={response.observations || ''}
            placeholder="Relate o motivo aqui..." 
            className="w-full mt-3 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
            onChange={e => setItemResponses(prev => ({...prev, [item.id]: {...(prev[item.id] as any), observations: e.target.value}}))}
          />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 relative animate-in slide-in-from-bottom-6 duration-700">
      {/* Alerta Customizado Centralizado */}
      {showAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0A2540]/60 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center space-y-8 animate-in zoom-in-95 duration-200">
             <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-100 shadow-xl">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
             </div>
             <div className="space-y-3">
                <h3 className="text-2xl font-black text-[#0A2540] uppercase tracking-tight">Atenção</h3>
                <p className="text-slate-500 font-bold leading-relaxed">{alertMessage}</p>
             </div>
             <button 
              onClick={() => setShowAlert(false)}
              className="w-full py-5 bg-[#0A2540] text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
             >
               ENTENDI, VOU REVISAR
             </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-10 px-6 sm:px-0">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-700 ${step >= s ? 'bg-[#1E90FF] shadow-lg shadow-blue-100' : 'bg-slate-100'}`}></div>
        ))}
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 p-8 sm:p-12 mb-8">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-3xl font-black text-[#0A2540] tracking-tight">
              {step === 0 && 'Informações Iniciais'}
              {step === 1 && 'Etapa 1: Veículo Desligado'}
              {step === 2 && 'Etapa 2: Funcionamento'}
              {step === 3 && 'Finalização'}
            </h2>
            <p className="text-slate-400 font-bold text-sm mt-2">
              {step === 3 ? 'Revise as pendências e assine' : 'Preencha todos os campos obrigatórios (*)'}
            </p>
          </div>
          <div className="bg-[#1E90FF]/10 px-5 py-2.5 rounded-2xl border border-[#1E90FF]/20">
            <span className="text-xs font-black text-[#1E90FF]">{step}/3</span>
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operação</label>
                  <select className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-800 outline-none focus:bg-white focus:border-[#1E90FF] transition-all" value={type} onChange={e => setType(e.target.value as any)}>
                    <option value="Saída">Saída</option>
                    <option value="Retorno">Retorno</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Turno</label>
                  <select className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-800 outline-none focus:bg-white focus:border-[#1E90FF] transition-all" value={shift} onChange={e => setShift(e.target.value)}>
                    <option value="Diurno">Diurno</option>
                    <option value="Noturno">Noturno</option>
                  </select>
                </div>
             </div>

             <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prefixo ecoSCheck</label>
                <select 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-800 outline-none focus:bg-white focus:border-[#1E90FF] transition-all"
                  onChange={e => {
                    const v = vehicles.find(v => v.id === e.target.value);
                    if (v) {
                      setSelectedVehicle(v);
                      setKm(v.current_km);
                      setHorimetro(v.current_horimetro);
                    }
                  }}
                >
                  <option value="">Buscar prefixo da frota...</option>
                  {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
                </select>
                {selectedVehicle && (
                  <div className="flex gap-4 px-4 mt-2">
                    <p className="text-[10px] font-black text-[#58CC02] uppercase">Sistema KM: {selectedVehicle.current_km}</p>
                    <p className="text-[10px] font-black text-[#58CC02] uppercase">Sistema HOR: {selectedVehicle.current_horimetro}</p>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KM Atual</label>
                  <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-800 outline-none focus:bg-white focus:border-[#1E90FF] transition-all" value={km} onChange={e => setKm(Number(e.target.value))} />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horímetro</label>
                  <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-800 outline-none focus:bg-white focus:border-[#1E90FF] transition-all" value={horimetro} onChange={e => setHorimetro(Number(e.target.value))} />
                </div>
             </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
            {Object.keys(stage1Items).map((cat) => (
              <div key={cat} className="space-y-5">
                <h3 className="text-[10px] font-black text-[#1E90FF] uppercase tracking-[0.3em] bg-blue-50/50 px-5 py-2.5 rounded-xl inline-block border border-blue-100">{cat}</h3>
                <div className="space-y-2">
                  {stage1Items[cat].map(renderItemRow)}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
            {Object.keys(stage2Items).map((cat) => (
              <div key={cat} className="space-y-5">
                <h3 className="text-[10px] font-black text-[#1E90FF] uppercase tracking-[0.3em] bg-blue-50/50 px-5 py-2.5 rounded-xl inline-block border border-blue-100">{cat}</h3>
                <div className="space-y-2">
                  {stage2Items[cat].map(renderItemRow)}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 animate-in fade-in zoom-in-95">
             <div className="space-y-5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Resumo da Inspeção</h4>
                {issuesSummary.length > 0 ? (
                  <div className="bg-red-50/50 rounded-[2.5rem] p-8 border border-red-100 space-y-4">
                    {issuesSummary.map(issue => (
                      <div key={issue.id} className="flex items-center justify-between border-b border-red-100/50 last:border-0 pb-3 last:pb-0">
                        <span className="text-xs font-black text-slate-700">{issue.label}</span>
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl text-white shadow-sm ${issue.status === ItemStatus.DEFECTIVE ? 'bg-red-600' : 'bg-orange-500'}`}>{issue.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#58CC02]/10 rounded-[2.5rem] p-10 border border-[#58CC02]/20 text-center">
                    <div className="w-16 h-16 bg-[#58CC02] text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-100">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <p className="text-sm font-black text-[#58CC02] uppercase tracking-widest">Aprovado sem Irregularidades</p>
                    <p className="text-[10px] text-green-600 font-bold mt-1">Todos os itens foram verificados e estão em conformidade.</p>
                  </div>
                )}
             </div>

             <div className="pt-10 border-t border-slate-100 space-y-6 text-center">
                <div className={`p-10 rounded-[3rem] border-4 transition-all ${isSigned ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-2xl' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'}`}>
                  {isSigned ? (
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-3">Vistoria Assinada por</p>
                       <p className="text-3xl font-black">{user.name}</p>
                       <button onClick={() => setIsSigned(false)} className="mt-6 text-[10px] font-black uppercase tracking-widest border border-white/20 px-6 py-2 rounded-full hover:bg-white/10">Refazer Assinatura</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <p className="text-sm font-bold text-slate-600 leading-relaxed px-6">Eu, <span className="text-[#0A2540] font-black uppercase">{user.name}</span>, declaro que as informações acima condizem com o estado real do veículo.</p>
                       <button onClick={() => setIsSigned(true)} className="bg-[#1E90FF] text-white px-12 py-5 rounded-[2rem] font-black text-xs shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">Confirmar e Assinar</button>
                    </div>
                  )}
                </div>
             </div>

             <textarea 
                className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-[2.5rem] h-32 font-bold outline-none focus:bg-white focus:border-[#1E90FF] transition-all"
                value={generalObs}
                onChange={e => setGeneralObs(e.target.value)}
                placeholder="Observações adicionais da operação..."
             />
          </div>
        )}
      </div>

      <div className="flex gap-4 px-6 sm:px-0">
        <button onClick={onCancel} className="px-8 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Cancelar</button>
        <div className="flex-1"></div>
        {step > 0 && <button onClick={() => setStep(step - 1)} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest">Voltar</button>}
        {step < 3 ? (
          <button onClick={handleNext} className="px-14 py-5 bg-[#1E90FF] text-white rounded-[2rem] font-black text-xs shadow-2xl shadow-blue-100 hover:bg-[#0A2540] transition-all uppercase tracking-widest">Continuar</button>
        ) : (
          <button 
            onClick={handleSubmit} 
            disabled={!isSigned || isSubmitting}
            className={`px-14 py-5 rounded-[2rem] font-black text-xs shadow-2xl transition-all uppercase tracking-widest ${isSigned && !isSubmitting ? 'bg-[#58CC02] text-white shadow-green-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isSubmitting ? 'Enviando...' : 'Finalizar e Enviar'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChecklistForm;

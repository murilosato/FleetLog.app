
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

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Filtragem mais permissiva: se o status não for explicitamente falso, assume ativo
  const validAvailableItems = useMemo(() => {
    return (availableItems || []).filter(item => item.active !== false);
  }, [availableItems]);

  const activeVehicles = useMemo(() => {
    return (vehicles || []).filter(v => v.active !== false);
  }, [vehicles]);

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
          .from('checklist_entries')
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

  const handleSurveyedToggle = (itemId: number, surveyed: boolean) => {
    setItemResponses(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] as any), surveyed, status: surveyed ? prev[itemId]?.status : null }
    }));
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
      const unanswered = allS1.filter(i => itemResponses[i.id]?.surveyed && !itemResponses[i.id]?.status);
      if (unanswered.length > 0) {
        triggerAlert("POSSUI ITENS VISTORIADOS PENDENTES DE STATUS (OK/DEFEITO/FALTA)");
        return;
      }
    }

    if (step === 2) {
      const allS2 = Object.values(stage2Items).flat() as DBChecklistItem[];
      const unanswered = allS2.filter(i => itemResponses[i.id]?.surveyed && !itemResponses[i.id]?.status);
      if (unanswered.length > 0) {
        triggerAlert("POSSUI ITENS VISTORIADOS PENDENTES DE STATUS (OK/DEFEITO/FALTA)");
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
            return item ? `${item.id}. ${item.label}` : `Item ${id}`;
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
      .filter(([id, data]) => (data as any).surveyed && (data as any).status && (data as any).status !== ItemStatus.OK)
      .map(([id, data]) => {
        const itemInfo = validAvailableItems.find(i => i.id.toString() === id);
        return {
          id,
          label: itemInfo ? `${itemInfo.id}. ${itemInfo.label}` : `Item ${id}`,
          status: (data as any).status
        };
      });
  }, [itemResponses, validAvailableItems]);

  const nonSurveyedSummary = useMemo(() => {
    return Object.entries(itemResponses)
      .filter(([id, data]) => !(data as any).surveyed)
      .map(([id, data]) => {
        const itemInfo = validAvailableItems.find(i => i.id.toString() === id);
        return {
          id,
          label: itemInfo ? `${itemInfo.id}. ${itemInfo.label}` : `Item ${id}`
        };
      });
  }, [itemResponses, validAvailableItems]);

  const renderItemRow = (item: DBChecklistItem) => {
    const isDivergent = divergenceItems.includes(item.id);
    const response = itemResponses[item.id];
    const isSurveyed = response?.surveyed ?? true;
    const cleanLabel = (item.label || '').replace(/^\d+\.\s*/, '');

    return (
      <div key={item.id} className={`py-5 sm:py-6 border-b border-slate-50 last:border-0 transition-all ${isDivergent ? 'bg-red-50/50 -mx-4 px-4 rounded-[1.5rem] sm:rounded-3xl' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex flex-col gap-1 flex-1">
             <p className={`font-black text-[#0A2540] text-sm sm:text-base leading-tight ${!isSurveyed ? 'opacity-40' : ''}`}>
               <span className="text-[#1E90FF] mr-1">{item.id}.</span> {cleanLabel} <span className="text-red-500">*</span>
             </p>
             <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Item vistoriado?</span>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => handleSurveyedToggle(item.id, true)}
                    className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${isSurveyed ? 'bg-white text-[#1E90FF] shadow-sm' : 'text-slate-400'}`}
                  >SIM</button>
                  <button 
                    onClick={() => handleSurveyedToggle(item.id, false)}
                    className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${!isSurveyed ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400'}`}
                  >NÃO</button>
                </div>
             </div>
          </div>
          {isDivergent && <span className="text-[9px] sm:text-[10px] bg-red-600 text-white px-2.5 py-1 rounded-lg font-black uppercase tracking-widest self-start sm:self-auto">Divergência</span>}
        </div>

        {isSurveyed && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex gap-2 sm:gap-3">
              {Object.values(ItemStatus).map(s => (
                <button 
                  key={s}
                  onClick={() => handleStatusChange(item.id, s)}
                  className={`flex-1 py-3.5 sm:py-4 text-[11px] sm:text-xs font-black rounded-xl sm:rounded-2xl border-2 transition-all active:scale-95 ${response?.status === s ? (s === ItemStatus.OK ? 'bg-[#58CC02] border-[#58CC02] text-white shadow-lg' : (s === ItemStatus.DEFECTIVE ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-orange-500 border-orange-500 text-white shadow-lg')) : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >{s}</button>
              ))}
            </div>
            {response?.status && response.status !== ItemStatus.OK && (
              <input 
                value={response.observations || ''}
                placeholder="Relate o motivo aqui..." 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-slate-950 outline-none focus:border-slate-300 transition-all"
                onChange={e => setItemResponses(prev => ({...prev, [item.id]: {...(prev[item.id] as any), observations: e.target.value}}))}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 relative animate-in slide-in-from-bottom-6 duration-700">
      {showAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0A2540]/60 backdrop-blur-md">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl max-w-sm w-full text-center space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-200">
             <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-100 shadow-xl">
                <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
             </div>
             <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-black text-[#0A2540] uppercase tracking-tight">Atenção</h3>
                <p className="text-slate-500 font-bold leading-relaxed text-sm">{alertMessage}</p>
             </div>
             <button 
              onClick={() => setShowAlert(false)}
              className="w-full py-4 sm:py-5 bg-[#0A2540] text-white rounded-2xl sm:rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
             >
               ENTENDI, VOU REVISAR
             </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-8 sm:mb-10 px-6 sm:px-0">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 sm:h-2 flex-1 rounded-full transition-all duration-700 ${step >= s ? 'bg-[#1E90FF] shadow-lg shadow-blue-100' : 'bg-slate-100'}`}></div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-slate-100 p-6 sm:p-12 mb-8">
        <div className="flex justify-between items-start mb-8 sm:mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0A2540] tracking-tight">
              {step === 0 && 'Informações Iniciais'}
              {step === 1 && 'Etapa 1: Desligado'}
              {step === 2 && 'Etapa 2: Ligado'}
              {step === 3 && 'Finalização'}
            </h2>
            <p className="text-slate-400 font-bold text-xs sm:text-sm mt-1 sm:mt-2">
              {step === 3 ? 'Revise as pendências e assine' : 'Preencha todos os campos (*)'}
            </p>
          </div>
          <div className="bg-[#1E90FF]/10 px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl border border-[#1E90FF]/20">
            <span className="text-[10px] sm:text-xs font-black text-[#1E90FF]">{step}/3</span>
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Operação</label>
                  <select className="w-full p-4 sm:p-5 bg-slate-50 border-2 border-slate-50 rounded-xl sm:rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#1E90FF] transition-all text-sm sm:text-base" value={type} onChange={e => setType(e.target.value as any)}>
                    <option value="Saída">Saída</option>
                    <option value="Retorno">Retorno</option>
                  </select>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Turno</label>
                  <select className="w-full p-4 sm:p-5 bg-slate-50 border-2 border-slate-50 rounded-xl sm:rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#1E90FF] transition-all text-sm sm:text-base" value={shift} onChange={e => setShift(e.target.value)}>
                    <option value="Diurno">Diurno</option>
                    <option value="Noturno">Noturno</option>
                  </select>
                </div>
             </div>

             <div className="space-y-2 sm:space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Prefixo FleetLog</label>
                <select 
                  className="w-full p-4 sm:p-5 bg-slate-50 border-2 border-slate-50 rounded-xl sm:rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#1E90FF] transition-all text-sm sm:text-base"
                  value={selectedVehicle?.id || ''}
                  onChange={e => {
                    const v = activeVehicles.find(v => v.id === e.target.value);
                    if (v) {
                      setSelectedVehicle(v);
                      setKm(v.current_km);
                      setHorimetro(v.current_horimetro);
                    }
                  }}
                >
                  <option value="">Buscar prefixo...</option>
                  {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
                </select>
                {selectedVehicle && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 mt-1 sm:mt-2">
                    <p className="text-[10px] font-black text-[#58CC02] uppercase tracking-wider">Sist. KM: {selectedVehicle.current_km}</p>
                    <p className="text-[10px] font-black text-[#58CC02] uppercase tracking-wider">Sist. HOR: {selectedVehicle.current_horimetro}</p>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">KM Atual</label>
                  <input type="number" className="w-full p-4 sm:p-5 bg-slate-50 border-2 border-slate-50 rounded-xl sm:rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#1E90FF] transition-all text-sm sm:text-base" value={km} onChange={e => setKm(Number(e.target.value))} />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Horímetro</label>
                  <input type="number" className="w-full p-4 sm:p-5 bg-slate-50 border-2 border-slate-50 rounded-xl sm:rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#1E90FF] transition-all text-sm sm:text-base" value={horimetro} onChange={e => setHorimetro(Number(e.target.value))} />
                </div>
             </div>
          </div>
        )}

        {(step === 1 || step === 2) && (
          <div className="space-y-10 sm:space-y-12 animate-in fade-in slide-in-from-right-4">
            {Object.keys(step === 1 ? stage1Items : stage2Items).map((cat) => (
              <div key={cat} className="space-y-4 sm:space-y-5">
                <h3 className="text-[10px] sm:text-[11px] font-black text-[#1E90FF] uppercase tracking-[0.2em] bg-blue-50/50 px-4 py-2 rounded-lg sm:rounded-xl inline-block border border-blue-100">{cat}</h3>
                <div className="space-y-1 sm:space-y-2">
                  {(step === 1 ? stage1Items[cat] : stage2Items[cat]).map(renderItemRow)}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 sm:space-y-10 animate-in fade-in zoom-in-95">
             <div className="space-y-6 sm:space-y-8">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Resumo da Inspeção</h4>
                <p className="text-[10px] font-bold text-slate-400 mb-2 ml-2 italic">Data da Vistoria: {formatDateDisplay(new Date().toISOString().split('T')[0])}</p>
                
                {issuesSummary.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Problemas Detectados</p>
                    <div className="bg-red-50/50 rounded-[1.8rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-red-100 space-y-3">
                      {issuesSummary.map(issue => (
                        <div key={issue.id} className="flex items-center justify-between border-b border-red-100/50 last:border-0 pb-2 sm:pb-3 last:pb-0 gap-3">
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight">{issue.label}</span>
                          <span className={`text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-white shadow-sm shrink-0 ${issue.status === ItemStatus.DEFECTIVE ? 'bg-red-600' : 'bg-orange-500'}`}>{issue.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nonSurveyedSummary.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Itens Não Vistoriados</p>
                    <div className="bg-slate-50 rounded-[1.8rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 space-y-3">
                      {nonSurveyedSummary.map(item => (
                        <div key={item.id} className="flex items-center justify-between border-b border-slate-200/50 last:border-0 pb-2 sm:pb-3 last:pb-0 gap-3">
                          <span className="text-xs sm:text-sm font-black text-slate-400 leading-tight">{item.label}</span>
                          <span className="text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-200 text-slate-500 shadow-sm shrink-0">IGNORADO</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {issuesSummary.length === 0 && nonSurveyedSummary.length === 0 && (
                  <div className="bg-[#58CC02]/10 rounded-[1.8rem] sm:rounded-[2.5rem] p-8 sm:p-10 border border-[#58CC02]/20 text-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#58CC02] text-white rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xl shadow-green-100">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-[#58CC02] uppercase tracking-widest">Veículo 100% OK</p>
                    <p className="text-[10px] text-green-600 font-bold mt-1">Inspeção completa concluída com sucesso.</p>
                  </div>
                )}
             </div>

             <div className="pt-8 sm:pt-10 border-t border-slate-100 space-y-5 sm:space-y-6 text-center">
                <div className={`p-6 sm:p-10 rounded-[1.8rem] sm:rounded-[3rem] border-4 transition-all ${isSigned ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-2xl' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'}`}>
                  {isSigned ? (
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2 sm:mb-3">Checklist Assinado por</p>
                       <p className="text-2xl sm:text-3xl font-black">{user.name}</p>
                       <button onClick={() => setIsSigned(false)} className="mt-4 sm:mt-6 text-[10px] font-black uppercase tracking-widest border border-white/20 px-5 sm:px-6 py-1.5 sm:py-2 rounded-full hover:bg-white/10 transition-colors">Refazer</button>
                    </div>
                  ) : (
                    <div className="space-y-5 sm:space-y-6">
                       <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed px-4 sm:px-6">Eu, <span className="text-[#0A2540] font-black uppercase">{user.name}</span>, declaro que as informações acima condizem com o estado real do veículo.</p>
                       <button onClick={() => setIsSigned(true)} className="bg-[#1E90FF] text-white px-10 py-4 sm:px-12 sm:py-5 rounded-xl sm:rounded-[2rem] font-black text-xs shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">Confirmar e Assinar</button>
                    </div>
                  )}
                </div>
             </div>

             <textarea 
                className="w-full p-4 sm:p-6 bg-slate-50 border-2 border-slate-50 rounded-xl sm:rounded-[2.5rem] h-28 sm:h-32 font-bold text-slate-950 outline-none focus:bg-white focus:border-[#1E90FF] transition-all text-xs sm:text-sm"
                value={generalObs}
                onChange={e => setGeneralObs(e.target.value)}
                placeholder="Observações adicionais da operação..."
             />
          </div>
        )}
      </div>

      <div className="flex gap-3 sm:gap-4 px-6 sm:px-0">
        <button onClick={onCancel} className="px-4 py-4 sm:px-8 sm:py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Cancelar</button>
        <div className="flex-1"></div>
        {step > 0 && <button onClick={() => setStep(step - 1)} className="px-6 py-4 sm:px-10 sm:py-5 bg-slate-100 text-slate-600 rounded-xl sm:rounded-[2rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Voltar</button>}
        {step < 3 ? (
          <button onClick={handleNext} className="px-10 py-4 sm:px-14 sm:py-5 bg-[#1E90FF] text-white rounded-xl sm:rounded-[2rem] font-black text-xs shadow-2xl shadow-blue-100 hover:bg-[#0A2540] transition-all uppercase tracking-widest active:scale-95">Próximo</button>
        ) : (
          <button 
            onClick={handleSubmit} 
            disabled={!isSigned || isSubmitting}
            className={`px-10 py-4 sm:px-14 sm:py-5 rounded-xl sm:rounded-[2rem] font-black text-xs shadow-2xl transition-all uppercase tracking-widest active:scale-95 ${isSigned && !isSubmitting ? 'bg-[#58CC02] text-white shadow-green-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isSubmitting ? 'Enviando...' : 'Finalizar'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChecklistForm;

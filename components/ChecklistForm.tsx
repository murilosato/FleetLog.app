
import React, { useState } from 'react';
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
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [km, setKm] = useState(0);
  const [horimetro, setHorimetro] = useState(0);
  const [shift, setShift] = useState('Diurno');
  const [type, setType] = useState<'Saída' | 'Retorno'>('Saída');
  const [responses, setResponses] = useState<Record<string, { status: ItemStatus; observations?: string; surveyed: boolean }>>({});
  const [generalObs, setGeneralObs] = useState('');
  const [loading, setLoading] = useState(false);

  // Update item status in responses
  const handleItemChange = (itemId: number, status: ItemStatus) => {
    setResponses(prev => ({
      ...prev,
      [itemId.toString()]: { ...prev[itemId.toString()], status, surveyed: true }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setLoading(true);

    // Added explicit casting to any to fix "Property 'status' does not exist on type 'unknown'" on lines 38-39
    const hasDefects = Object.values(responses).some((r: any) => r.status === ItemStatus.DEFECTIVE);
    const hasMissing = Object.values(responses).some((r: any) => r.status === ItemStatus.MISSING);
    const hasDivergence = false;

    // Fixed ChecklistEntry object creation with all required variables
    const entry: ChecklistEntry = {
      id: crypto.randomUUID(),
      // company_id is now part of ChecklistEntry and User interfaces in types.ts to fix line 45 error
      company_id: user.company_id, // CRÍTICO PARA RLS
      date: new Date().toISOString().split('T')[0],
      shift,
      type,
      driver_name: user.name,
      prefix: selectedVehicle.prefix,
      vehicle_id: selectedVehicle.id,
      km,
      horimetro,
      items: responses,
      general_observations: generalObs,
      created_at: Date.now(),
      user_id: user.id,
      has_issues: hasDefects || hasMissing || hasDivergence,
      operation_checked: !hasMissing,
      maintenance_checked: !hasDefects
    };

    try {
      const { error } = await supabase.from('checklist_entries').insert([entry]);
      if (error) throw error;
      
      // Update vehicle KM/Horimetro
      await supabase.from('vehicles').update({ 
        current_km: km, 
        current_horimetro: horimetro 
      }).eq('id', selectedVehicle.id);

      onSubmit(entry);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar checklist. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-10 bg-white rounded-[3rem] shadow-sm border border-slate-100 animate-in slide-in-from-bottom-6">
      <h2 className="text-3xl font-black text-[#0A2540] mb-8 uppercase flex items-center gap-4">
        <div className="w-2 h-8 bg-[#00548b] rounded-full"></div>
        Vistoria de Veículo
      </h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Veículo</label>
            <select 
              className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#00548b] transition-all"
              onChange={(e) => {
                const v = vehicles.find(v => v.id === e.target.value);
                if (v) {
                  setSelectedVehicle(v);
                  setKm(v.current_km);
                  setHorimetro(v.current_horimetro);
                }
              }}
              required
            >
              <option value="">Selecionar prefixo...</option>
              {vehicles.filter(v => v.active).map(v => (
                <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Tipo & Turno</label>
            <div className="flex gap-2">
               <select value={type} onChange={e => setType(e.target.value as any)} className="flex-1 p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none">
                 <option value="Saída">Saída</option>
                 <option value="Retorno">Retorno</option>
               </select>
               <select value={shift} onChange={e => setShift(e.target.value)} className="flex-1 p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none">
                 <option value="Diurno">Diurno</option>
                 <option value="Noturno">Noturno</option>
               </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">KM Atual</label>
            <input type="number" value={km} onChange={e => setKm(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#00548b] transition-all" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Horímetro</label>
            <input type="number" value={horimetro} onChange={e => setHorimetro(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#00548b] transition-all" required />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-black text-[#0A2540] uppercase flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#00548b] rounded-full"></div>
            Itens Obrigatórios
          </h3>
          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 hide-scrollbar">
            {availableItems.filter(i => i.active !== false).map(item => (
              <div key={item.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <span className="text-xs font-bold text-[#0A2540] uppercase">{item.label}</span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {[ItemStatus.OK, ItemStatus.MISSING, ItemStatus.DEFECTIVE].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleItemChange(item.id, status)}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${responses[item.id.toString()]?.status === status ? 'bg-[#00548b] text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-transparent hover:border-slate-200'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Observações Gerais</label>
          <textarea value={generalObs} onChange={e => setGeneralObs(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-bold text-slate-950 outline-none focus:bg-white focus:border-[#00548b] transition-all h-32" placeholder="Descreva qualquer detailhe adicional..." />
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
          <button disabled={loading || !selectedVehicle} className="flex-1 py-5 bg-[#0A2540] text-white rounded-[1.8rem] font-black text-[10px] uppercase
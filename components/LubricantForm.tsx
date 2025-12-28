
import React, { useState, useEffect } from 'react';
import { User, Vehicle, LubricantType } from '../types';
import { supabase } from '../lib/supabase';

interface LubricantFormProps {
  user: User;
  vehicles: Vehicle[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const LubricantForm: React.FC<LubricantFormProps> = ({ user, vehicles, onSubmit, onCancel }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [km, setKm] = useState(0);
  const [hor, setHor] = useState(0);
  const [lubricantTypes, setLubricantTypes] = useState<LubricantType[]>([]);
  const [selectedLub, setSelectedLub] = useState('');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);

  // Custom Alert State
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

  useEffect(() => {
    supabase.from('lubricant_types').select('*').eq('active', true).then(({ data }) => {
      if (data) setLubricantTypes(data);
    });
  }, []);

  const triggerAlert = (title: string, message: string) => {
    setAlertConfig({ title, message });
    setShowAlert(true);
  };

  const validateValues = () => {
    if (!selectedVehicle) return false;

    if (km < selectedVehicle.current_km) {
      triggerAlert(
        "KM Inválido",
        `O KM informado (${km}) é inferior ao KM atual registrado no sistema (${selectedVehicle.current_km}). Verifique o odômetro do veículo.`
      );
      return false;
    }
    
    if (km > selectedVehicle.current_km + selectedVehicle.max_km_jump) {
      triggerAlert(
        "Alerta de Pulo de KM",
        `O KM informado excede o limite permitido (${selectedVehicle.max_km_jump}km).`
      );
      return false;
    }

    if (hor < selectedVehicle.current_horimetro) {
      triggerAlert(
        "Horímetro Inválido",
        `O Horímetro informado (${hor}) é inferior ao atual no sistema (${selectedVehicle.current_horimetro}).`
      );
      return false;
    }
    
    if (hor > selectedVehicle.current_horimetro + selectedVehicle.max_horimetro_jump) {
      triggerAlert(
        "Alerta de Horímetro",
        `O Horímetro informado excede o limite permitido (${selectedVehicle.max_horimetro_jump}h).`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedLub || !qty) return;
    if (!validateValues()) return;

    setLoading(true);
    
    const entry = {
      id: crypto.randomUUID(),
      event_at: new Date().toISOString(),
      vehicle_id: selectedVehicle.id,
      prefix: selectedVehicle.prefix,
      km: Number(km),
      horimetro: Number(hor),
      lubricant_type_id: Number(selectedLub),
      quantity: Number(qty),
      user_id: user.id
    };

    try {
      const { error } = await supabase.from('lubricant_entries').insert([entry]);
      if (error) throw error;
      
      await supabase.from('vehicles').update({ 
        current_km: Number(km), 
        current_horimetro: Number(hor) 
      }).eq('id', selectedVehicle.id);
      
      onSubmit(entry);
    } catch (err: any) {
      triggerAlert("Erro ao Salvar", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-10 bg-white rounded-[3rem] shadow-sm border border-slate-100 animate-in slide-in-from-bottom-6 relative">
      
      {/* Centered Validation Alert */}
      {showAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0A2540]/60 backdrop-blur-md">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
             <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-100 shadow-xl">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-[#0A2540] uppercase tracking-tight">{alertConfig.title}</h3>
                <p className="text-slate-500 font-bold leading-relaxed text-sm">{alertConfig.message}</p>
             </div>
             <button 
              onClick={() => setShowAlert(false)}
              className="w-full py-4 bg-[#0A2540] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
             >
               CORRIGIR VALORES
             </button>
          </div>
        </div>
      )}

      <h2 className="text-3xl font-black text-[#0A2540] mb-8 uppercase flex items-center gap-4">
        <div className="w-2 h-8 bg-[#FFA500] rounded-full"></div>
        Lubrificante
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Veículo</label>
          <select 
            className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#FFA500] transition-all" 
            onChange={e => {
              const v = vehicles.find(v => v.id === e.target.value);
              if (v) { 
                setSelectedVehicle(v); 
                setKm(v.current_km); 
                setHor(v.current_horimetro); 
              }
            }} 
            required
          >
            <option value="">Selecionar prefixo...</option>
            {vehicles.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
          </select>

          {selectedVehicle && (
            <div className="grid grid-cols-2 gap-3 px-5 py-4 bg-[#FFA500]/5 rounded-[1.5rem] border border-[#FFA500]/20 mt-3 animate-in fade-in">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-[#FFA500] uppercase tracking-widest opacity-60">KM Sistema</p>
                <p className="text-sm font-black text-[#0A2540]">{selectedVehicle.current_km}</p>
              </div>
              <div className="space-y-0.5 border-l border-[#FFA500]/20 pl-4">
                <p className="text-[8px] font-black text-[#FFA500] uppercase tracking-widest opacity-60">HOR Sistema</p>
                <p className="text-sm font-black text-[#0A2540]">{selectedVehicle.current_horimetro}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">KM Atual</label>
            <input type="number" value={km} onChange={e => setKm(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#FFA500] transition-all" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Horímetro</label>
            <input type="number" value={hor} onChange={e => setHor(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#FFA500] transition-all" required />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Tipo de Lubrificante</label>
          <select value={selectedLub} onChange={e => setSelectedLub(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#FFA500] transition-all" required>
            <option value="">Selecionar...</option>
            {lubricantTypes.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Quantidade (L/Kg)</label>
          <input type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-[#FFA500] transition-all" required />
        </div>
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
          <button disabled={loading} className="flex-1 py-5 bg-[#FFA500] text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Salvando...' : 'Finalizar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LubricantForm;

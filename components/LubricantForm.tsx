
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

  useEffect(() => {
    supabase.from('lubricant_types').select('*').eq('active', true).then(({ data }) => {
      if (data) setLubricantTypes(data);
    });
  }, []);

  const validateValues = () => {
    if (!selectedVehicle) return false;

    if (km < selectedVehicle.current_km) {
      alert(`KM inválido. O valor atual é ${selectedVehicle.current_km}.`);
      return false;
    }
    if (km > selectedVehicle.current_km + selectedVehicle.max_km_jump) {
      alert(`KM excede o limite permitido (${selectedVehicle.max_km_jump}km). Verifique o valor.`);
      return false;
    }

    if (hor < selectedVehicle.current_horimetro) {
      alert(`Horímetro inválido. O valor atual é ${selectedVehicle.current_horimetro}.`);
      return false;
    }
    if (hor > selectedVehicle.current_horimetro + selectedVehicle.max_horimetro_jump) {
      alert(`Horímetro excede o limite permitido (${selectedVehicle.max_horimetro_jump}h). Verifique o valor.`);
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
      alert("Erro ao registrar lubrificante: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-10 bg-white rounded-[3rem] shadow-sm border border-slate-100 animate-in slide-in-from-bottom-6">
      <h2 className="text-3xl font-black text-[#0A2540] mb-8 uppercase flex items-center gap-4">
        <div className="w-2 h-8 bg-[#FFA500] rounded-full"></div>
        Lubrificante
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Veículo</label>
          <select 
            className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#FFA500] transition-all" 
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
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">KM Atual (Min: {selectedVehicle?.current_km || 0})</label>
            <input type="number" value={km} onChange={e => setKm(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#FFA500] transition-all" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Horímetro (Min: {selectedVehicle?.current_horimetro || 0})</label>
            <input type="number" value={hor} onChange={e => setHor(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#FFA500] transition-all" required />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Tipo de Lubrificante</label>
          <select value={selectedLub} onChange={e => setSelectedLub(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#FFA500] transition-all" required>
            <option value="">Selecionar...</option>
            {lubricantTypes.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Quantidade (L/Kg)</label>
          <input type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#FFA500] transition-all" required />
        </div>
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
          <button disabled={loading} className="flex-1 py-5 bg-[#FFA500] text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-100 active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Salvando...' : 'Finalizar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LubricantForm;


import React, { useState, useEffect } from 'react';
import { User, Vehicle, FuelType } from '../types';
import { supabase } from '../lib/supabase';

interface RefuelingFormProps {
  user: User;
  vehicles: Vehicle[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const RefuelingForm: React.FC<RefuelingFormProps> = ({ user, vehicles, onSubmit, onCancel }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [km, setKm] = useState(0);
  const [hor, setHor] = useState(0);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [selectedFuel, setSelectedFuel] = useState('');
  const [qty, setQty] = useState('');
  const [arlaQty, setArlaQty] = useState('');
  const [showArla, setShowArla] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalLimits, setGlobalLimits] = useState({ km: 500, hor: 24 });

  useEffect(() => {
    supabase.from('fuel_types').select('*').eq('active', true).then(({ data }) => {
      if (data) setFuelTypes(data);
    });
    supabase.from('global_settings').select('*').then(({ data }) => {
      if (data) {
        const kmLimit = data.find(s => s.config_key === 'default_max_km_jump')?.config_value;
        const horLimit = data.find(s => s.config_key === 'default_max_horimetro_jump')?.config_value;
        setGlobalLimits({ 
          km: Number(kmLimit || 500), 
          hor: Number(horLimit || 24) 
        });
      }
    });
  }, []);

  const validateValues = () => {
    if (!selectedVehicle) return false;

    const maxKm = selectedVehicle.max_km_jump || globalLimits.km;
    const maxHor = selectedVehicle.max_horimetro_jump || globalLimits.hor;

    if (km < selectedVehicle.current_km) {
      alert(`KM inválido. O valor atual é ${selectedVehicle.current_km}.`);
      return false;
    }
    if (km > selectedVehicle.current_km + maxKm) {
      alert(`KM excede o limite permitido (${maxKm}km). Verifique o valor.`);
      return false;
    }

    if (hor < selectedVehicle.current_horimetro) {
      alert(`Horímetro inválido. O valor atual é ${selectedVehicle.current_horimetro}.`);
      return false;
    }
    if (hor > selectedVehicle.current_horimetro + maxHor) {
      alert(`Horímetro excede o limite permitido (${maxHor}h). Verifique o valor.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedFuel || !qty) return;
    if (!validateValues()) return;

    setLoading(true);
    const entry = {
      id: crypto.randomUUID(),
      event_at: new Date().toISOString(),
      vehicle_id: selectedVehicle.id,
      prefix: selectedVehicle.prefix,
      km: Number(km),
      horimetro: Number(hor),
      fuel_type_id: Number(selectedFuel),
      quantity: Number(qty),
      arla_quantity: showArla ? Number(arlaQty) : 0,
      user_id: user.id
    };

    try {
      const { error } = await supabase.from('refueling_entries').insert([entry]);
      if (error) throw error;
      await supabase.from('vehicles').update({ current_km: Number(km), current_horimetro: Number(hor) }).eq('id', selectedVehicle.id);
      onSubmit(entry);
    } catch (err: any) {
      alert("Erro ao registrar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-10 bg-white rounded-[3rem] shadow-sm border border-slate-100 animate-in slide-in-from-bottom-6">
      <h2 className="text-3xl font-black text-[#0A2540] mb-8 uppercase flex items-center gap-4">
        <div className="w-2 h-8 bg-[#58CC02] rounded-full"></div>
        Abastecimento
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Veículo</label>
          <select 
            className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#58CC02] transition-all" 
            onChange={e => {
              const v = vehicles.find(v => v.id === e.target.value);
              if (v) { setSelectedVehicle(v); setKm(v.current_km); setHor(v.current_horimetro); }
            }} 
            required
          >
            <option value="">Selecionar prefixo...</option>
            {vehicles.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">KM Atual</label>
            <input type="number" value={km} onChange={e => setKm(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#58CC02] transition-all" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Horímetro</label>
            <input type="number" value={hor} onChange={e => setHor(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#58CC02] transition-all" required />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Tipo de Combustível</label>
          <select value={selectedFuel} onChange={e => setSelectedFuel(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#58CC02] transition-all" required>
            <option value="">Selecionar...</option>
            {fuelTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Quantidade (Litros)</label>
          <input type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#58CC02] transition-all" required />
        </div>
        <div className="pt-2">
           <button type="button" onClick={() => setShowArla(!showArla)} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showArla ? 'bg-[#1E90FF] text-white shadow-lg' : 'bg-slate-50 text-slate-400 border-2 border-slate-100'}`}>
              Registrar ARLA 32?
           </button>
        </div>
        {showArla && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#1E90FF] uppercase tracking-widest ml-1">Quantidade ARLA 32 (Litros)</label>
            <input type="number" step="0.01" value={arlaQty} onChange={e => setArlaQty(e.target.value)} className="w-full p-5 bg-blue-50 border-2 border-blue-100 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#1E90FF] transition-all" required />
          </div>
        )}
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
          <button disabled={loading} className="flex-1 py-5 bg-[#58CC02] text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Salvando...' : 'Finalizar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RefuelingForm;

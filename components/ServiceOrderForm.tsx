
import React, { useState, useEffect } from 'react';
import { User, Vehicle, ServiceOrder } from '../types';
import { supabase } from '../lib/supabase';

interface ServiceOrderFormProps {
  user: User;
  vehicles: Vehicle[];
  initialVehicleId?: string;
  initialKm?: number;
  initialHor?: number;
  initialDescription?: string;
  onSubmit: (os: ServiceOrder) => void;
  onCancel: () => void;
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ 
  user, 
  vehicles, 
  initialVehicleId = '', 
  initialKm = 0, 
  initialHor = 0,
  initialDescription = '',
  onSubmit, 
  onCancel 
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [km, setKm] = useState(initialKm);
  const [hor, setHor] = useState(initialHor);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [nextOSNumber, setNextOSNumber] = useState<number | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

  useEffect(() => {
    fetchNextOSNumber();
    if (initialVehicleId) {
      const v = vehicles.find(v => v.id === initialVehicleId);
      if (v) {
        setSelectedVehicle(v);
        if (initialKm === 0) setKm(v.current_km);
        if (initialHor === 0) setHor(v.current_horimetro);
      }
    }
  }, [initialVehicleId, vehicles]);

  const fetchNextOSNumber = async () => {
    const { data } = await supabase
      .from('service_orders')
      .select('os_number')
      .order('os_number', { ascending: false })
      .limit(1);
    
    const lastNum = data && data[0] ? data[0].os_number : 1000;
    setNextOSNumber(lastNum + 1);
  };

  const triggerAlert = (title: string, message: string) => {
    setAlertConfig({ title, message });
    setShowAlert(true);
  };

  const validate = () => {
    if (!selectedVehicle) {
      triggerAlert("Atenção", "Selecione um veículo.");
      return false;
    }
    if (km < selectedVehicle.current_km) {
      triggerAlert("KM Inválido", "O KM não pode ser menor que o registro atual do sistema.");
      return false;
    }
    if (hor < selectedVehicle.current_horimetro) {
      triggerAlert("Horímetro Inválido", "O Horímetro não pode ser menor que o registro atual.");
      return false;
    }
    if (!description.trim()) {
      triggerAlert("Campo Obrigatório", "Descreva o motivo da Ordem de Serviço.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      // 1. Criar O.S
      const { data: osData, error: osError } = await supabase
        .from('service_orders')
        .insert([{
          vehicle_id: selectedVehicle!.id,
          prefix: selectedVehicle!.prefix,
          km: Number(km),
          horimetro: Number(hor),
          description,
          user_id: user.id,
          status: 'OPEN'
        }])
        .select()
        .single();

      if (osError) throw osError;

      // 2. Registrar Log
      await supabase.from('service_order_logs').insert([{
        os_id: osData.id,
        os_number: osData.os_number,
        action_description: `Criação de Ordem de Serviço: ${description.substring(0, 50)}...`,
        user_name: user.name,
        vehicle_prefix: selectedVehicle!.prefix,
        km: Number(km),
        horimetro: Number(hor)
      }]);

      // 3. Atualizar Veículo
      await supabase.from('vehicles').update({ 
        current_km: Number(km), 
        current_horimetro: Number(hor) 
      }).eq('id', selectedVehicle!.id);

      onSubmit(osData as ServiceOrder);
    } catch (err: any) {
      triggerAlert("Erro ao Processar", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8">
      
      {showAlert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95">
             <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border-2 border-red-100">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
             </div>
             <div className="space-y-1">
                <h3 className="text-xl font-black text-[#0A2540] uppercase">{alertConfig.title}</h3>
                <p className="text-slate-500 font-bold text-sm">{alertConfig.message}</p>
             </div>
             <button onClick={() => setShowAlert(false)} className="w-full py-4 bg-[#0A2540] text-white rounded-2xl font-black text-xs uppercase tracking-widest">Entendido</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-[#0A2540] uppercase flex items-center gap-4">
          <div className="w-2 h-8 bg-red-600 rounded-full"></div>
          Ordem de Serviço
        </h2>
        {nextOSNumber && (
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nº Controle</p>
            <p className="text-xl font-tech font-bold text-red-600">#{nextOSNumber}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Veículo Relacionado</label>
          <select 
            className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-red-600 transition-all"
            value={selectedVehicle?.id || ''}
            onChange={e => {
              const v = vehicles.find(v => v.id === e.target.value);
              if (v) { setSelectedVehicle(v); setKm(v.current_km); setHor(v.current_horimetro); }
            }}
            required
            disabled={!!initialVehicleId}
          >
            <option value="">Buscar prefixo...</option>
            {vehicles.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KM Atual</label>
            <input type="number" value={km} onChange={e => setKm(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-red-600 transition-all" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horímetro</label>
            <input type="number" value={hor} onChange={e => setHor(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-red-600 transition-all" required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Problema / Motivo</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-[2rem] font-bold text-slate-900 outline-none focus:bg-white focus:border-red-600 transition-all min-h-[150px]"
            placeholder="Descreva detalhadamente o serviço necessário..."
            required
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
          <button disabled={loading} className="flex-1 py-5 bg-red-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all">
            {loading ? 'Processando...' : 'Abrir O.S.'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceOrderForm;

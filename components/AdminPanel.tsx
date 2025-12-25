
import React, { useState } from 'react';
import { Vehicle, DBChecklistItem } from '../types';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  vehicles: Vehicle[];
  items: DBChecklistItem[];
  onRefresh: () => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ vehicles, items, onRefresh, onBack }) => {
  const [tab, setTab] = useState<'vehicles' | 'items'>('vehicles');
  const [loading, setLoading] = useState(false);

  // Estados para novos cadastros
  const [newVehicle, setNewVehicle] = useState({ prefix: '', plate: '', km: 0, horimetro: 0 });
  const [newItem, setNewItem] = useState({ label: '', category: 'GERAL' });

  const handleToggleVehicle = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    const { error } = await supabase.from('vehicles').update({ active: !currentStatus }).eq('id', id);
    if (error) alert(error.message);
    else onRefresh();
    setLoading(false);
  };

  const handleUpdateVehicleValues = async (id: string, km: number, horimetro: number) => {
    setLoading(true);
    const { error } = await supabase.from('vehicles').update({ current_km: km, current_horimetro: horimetro }).eq('id', id);
    if (error) alert(error.message);
    else onRefresh();
    setLoading(false);
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.prefix || !newVehicle.plate) return;
    setLoading(true);
    const { error } = await supabase.from('vehicles').insert([{
      id: crypto.randomUUID(),
      prefix: newVehicle.prefix,
      plate: newVehicle.plate,
      current_km: newVehicle.km,
      current_horimetro: newVehicle.horimetro,
      active: true
    }]);
    if (error) alert(error.message);
    else {
      setNewVehicle({ prefix: '', plate: '', km: 0, horimetro: 0 });
      onRefresh();
    }
    setLoading(false);
  };

  const handleAddItem = async () => {
    if (!newItem.label) return;
    setLoading(true);
    const { error } = await supabase.from('checklist_items').insert([newItem]);
    if (error) alert(error.message);
    else {
      setNewItem({ label: '', category: 'GERAL' });
      onRefresh();
    }
    setLoading(false);
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este item?")) return;
    setLoading(true);
    const { error } = await supabase.from('checklist_items').delete().eq('id', id);
    if (error) alert(error.message);
    else onRefresh();
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white shadow-sm border rounded-2xl hover:bg-slate-50">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painel Administrativo</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setTab('vehicles')} 
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'vehicles' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Veículos
          </button>
          <button 
            onClick={() => setTab('items')} 
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'items' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Itens Checklist
          </button>
        </div>
      </div>

      {tab === 'vehicles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cadastro de Veículo */}
          <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border shadow-sm h-fit sticky top-24">
            <h3 className="font-black text-slate-800 text-lg mb-6 uppercase tracking-tight">Novo Veículo</h3>
            <div className="space-y-4">
              <input 
                placeholder="Prefixo (Ex: 100)" 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none"
                value={newVehicle.prefix}
                onChange={e => setNewVehicle({...newVehicle, prefix: e.target.value})}
              />
              <input 
                placeholder="Placa (Ex: ABC-1234)" 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none"
                value={newVehicle.plate}
                onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">KM Inicial</label>
                  <input 
                    type="number"
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none"
                    value={newVehicle.km}
                    onChange={e => setNewVehicle({...newVehicle, km: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Horímetro Inicial</label>
                  <input 
                    type="number"
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none"
                    value={newVehicle.horimetro}
                    onChange={e => setNewVehicle({...newVehicle, horimetro: Number(e.target.value)})}
                  />
                </div>
              </div>
              <button 
                onClick={handleAddVehicle}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50"
              >
                CADASTRAR VEÍCULO
              </button>
            </div>
          </div>

          {/* Listagem de Veículos */}
          <div className="lg:col-span-2 space-y-4">
            {vehicles.map(v => (
              <div key={v.id} className={`bg-white p-6 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-center gap-6 transition-opacity ${!v.active ? 'opacity-50' : ''}`}>
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center font-black text-2xl text-emerald-700">
                  {v.prefix}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-black text-slate-800 text-lg leading-tight">{v.plate}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase">{v.active ? 'Ativo na Frota' : 'Inativo'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                   <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase">KM</p>
                      <input 
                        type="number" 
                        defaultValue={v.current_km} 
                        onBlur={(e) => handleUpdateVehicleValues(v.id, Number(e.target.value), v.current_horimetro)}
                        className="w-20 bg-transparent text-center font-bold text-slate-700 outline-none focus:text-emerald-600"
                      />
                   </div>
                   <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase">HORÍM.</p>
                      <input 
                        type="number" 
                        defaultValue={v.current_horimetro} 
                        onBlur={(e) => handleUpdateVehicleValues(v.id, v.current_km, Number(e.target.value))}
                        className="w-20 bg-transparent text-center font-bold text-slate-700 outline-none focus:text-emerald-600"
                      />
                   </div>
                </div>
                <button 
                  onClick={() => handleToggleVehicle(v.id, v.active)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${v.active ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                >
                  {v.active ? 'Inativar' : 'Reativar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border shadow-sm h-fit sticky top-24">
            <h3 className="font-black text-slate-800 text-lg mb-6 uppercase tracking-tight">Novo Item</h3>
            <div className="space-y-4">
              <input 
                placeholder="Descrição do item" 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none"
                value={newItem.label}
                onChange={e => setNewItem({...newItem, label: e.target.value})}
              />
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none"
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
              >
                <option value="MOTOR (VEÍCULO DESLIGADO)">MOTOR</option>
                <option value="CABINE INTERNA/EXTERNA">CABINE</option>
                <option value="BAÚ">BAÚ</option>
                <option value="GERAL">GERAL</option>
                <option value="VERIFICAR FUNCIONAMENTO">FUNCIONAMENTO</option>
              </select>
              <button 
                onClick={handleAddItem}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50"
              >
                ADICIONAR ITEM
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Agrupamento por categoria */}
            {Array.from(new Set(items.map(i => i.category))).map(cat => (
              <div key={cat} className="space-y-3">
                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest ml-4">{cat}</h4>
                <div className="bg-white rounded-[2rem] border shadow-sm divide-y">
                  {items.filter(i => i.category === cat).map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors first:rounded-t-[2rem] last:rounded-b-[2rem]">
                      <span className="font-bold text-slate-700 text-sm">{item.label}</span>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-red-300 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

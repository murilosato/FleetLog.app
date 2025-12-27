
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

  // Form states for Vehicles
  const [vPrefix, setVPrefix] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vKm, setVKm] = useState('');
  const [vHor, setVHor] = useState('');

  // Form states for Items
  const [iLabel, setILabel] = useState('');
  const [iCategory, setICategory] = useState('CABINE INTERNA/EXTERNA');

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vPrefix || !vPlate) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('vehicles').insert([{
        prefix: vPrefix,
        plate: vPlate,
        current_km: Number(vKm) || 0,
        current_horimetro: Number(vHor) || 0,
        active: true
      }]);
      if (error) throw error;
      setVPrefix(''); setVPlate(''); setVKm(''); setVHor('');
      onRefresh();
    } catch (err: any) {
      alert("Erro ao cadastrar veículo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iLabel) return;
    setLoading(true);
    try {
      const maxId = items.length > 0 ? Math.max(...items.map(i => i.id)) : 0;
      const { error } = await supabase.from('checklist_items').insert([{
        id: maxId + 1,
        label: iLabel,
        category: iCategory,
        active: true
      }]);
      if (error) throw error;
      setILabel('');
      onRefresh();
    } catch (err: any) {
      alert("Erro ao cadastrar item: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleVehicleStatus = async (vehicle: Vehicle) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ active: !vehicle.active })
        .eq('id', vehicle.id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert("Erro ao atualizar status: " + err.message);
    }
  };

  const toggleItemStatus = async (item: DBChecklistItem) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ active: item.active === undefined ? false : !item.active })
        .eq('id', item.id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert("Erro ao atualizar status do item: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white shadow-sm border rounded-2xl hover:bg-slate-50 transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painel de Gestão</h2>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-2xl w-full md:w-auto">
          <button 
            onClick={() => setTab('vehicles')} 
            className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'vehicles' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Frota de Veículos
          </button>
          <button 
            onClick={() => setTab('items')} 
            className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'items' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Itens do Checklist
          </button>
        </div>
      </div>

      {tab === 'vehicles' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Cadastro no Topo */}
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <h3 className="font-black text-slate-800 text-lg mb-6 uppercase flex items-center gap-3">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              Cadastrar Novo Veículo
            </h3>
            <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prefixo Solurb</label>
                <input value={vPrefix} onChange={e => setVPrefix(e.target.value)} placeholder="Ex: 5001" className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-200 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Placa</label>
                <input value={vPlate} onChange={e => setVPlate(e.target.value)} placeholder="ABC1D23" className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-200 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">KM Inicial</label>
                <input type="number" value={vKm} onChange={e => setVKm(e.target.value)} placeholder="0" className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-200 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Horímetro Inicial</label>
                <input type="number" value={vHor} onChange={e => setVHor(e.target.value)} placeholder="0" className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-200 outline-none" />
              </div>
              <button 
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Adicionar Veículo'}
              </button>
            </form>
          </div>

          {/* Lista Abaixo */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 text-lg uppercase flex items-center gap-3 ml-4">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              Veículos Ativos e Inativos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(v => (
                <div key={v.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${v.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {v.prefix}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-lg">{v.plate}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">KM: {v.current_km} • Hor: {v.current_horimetro}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleVehicleStatus(v)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${v.active ? 'bg-emerald-100 text-emerald-600 hover:bg-red-50 hover:text-red-600' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}
                  >
                    {v.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Cadastro no Topo */}
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <h3 className="font-black text-slate-800 text-lg mb-6 uppercase flex items-center gap-3">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              Cadastrar Novo Item de Checklist
            </h3>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição do Item</label>
                <input value={iLabel} onChange={e => setILabel(e.target.value)} placeholder="Ex: Faróis de Milha" className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-200 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Categoria do Checklist</label>
                <select value={iCategory} onChange={e => setICategory(e.target.value)} className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-200 outline-none">
                  <option value="MOTOR (VEÍCULO DESLIGADO)">MOTOR (DESLIGADO)</option>
                  <option value="CABINE INTERNA/EXTERNA">CABINE</option>
                  <option value="BAÚ">BAÚ</option>
                  <option value="GERAL">GERAL</option>
                  <option value="VERIFICAR FUNCIONAMENTO">FUNCIONAMENTO</option>
                </select>
              </div>
              <button 
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Adicionar ao Sistema'}
              </button>
            </form>
          </div>

          {/* Lista Abaixo */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 text-lg uppercase flex items-center gap-3 ml-4">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              Itens do Checklist Oficiais (1-48) e Adicionais
            </h3>
            <div className="bg-white rounded-[2.5rem] border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">ID</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição do Item</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoria</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Status / Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.sort((a,b) => a.id - b.id).map(item => (
                      <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${item.active === false ? 'opacity-50' : ''}`}>
                        <td className="px-8 py-5 text-xs font-black text-slate-300">#{item.id}</td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-700">{item.label}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg font-black uppercase tracking-tighter">{item.category}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => toggleItemStatus(item)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${item.active !== false ? 'bg-emerald-100 text-emerald-600 hover:bg-red-50 hover:text-red-600' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}
                          >
                            {item.active !== false ? 'Ativo' : 'Desativado'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

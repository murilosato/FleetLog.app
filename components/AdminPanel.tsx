
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
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
            <svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-4xl font-black text-[#0A2540] tracking-tight">Gestão ecoSCheck</h2>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] w-full md:w-auto shadow-inner">
          <button 
            onClick={() => setTab('vehicles')} 
            className={`flex-1 md:flex-none px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${tab === 'vehicles' ? 'bg-[#1E90FF] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Frota
          </button>
          <button 
            onClick={() => setTab('items')} 
            className={`flex-1 md:flex-none px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${tab === 'items' ? 'bg-[#1E90FF] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Checklist
          </button>
        </div>
      </div>

      {tab === 'vehicles' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm border-slate-100">
            <h3 className="font-black text-[#0A2540] text-xl mb-8 uppercase flex items-center gap-4">
              <div className="w-2 h-8 bg-[#1E90FF] rounded-full"></div>
              Novo Veículo
            </h3>
            <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Prefixo</label>
                <input value={vPrefix} onChange={e => setVPrefix(e.target.value)} placeholder="Ex: 5001" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#1E90FF] transition-all" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Placa</label>
                <input value={vPlate} onChange={e => setVPlate(e.target.value)} placeholder="ABC1D23" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#1E90FF] transition-all" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">KM Inicial</label>
                <input type="number" value={vKm} onChange={e => setVKm(e.target.value)} placeholder="0" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#1E90FF] transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Horímetro</label>
                <input type="number" value={vHor} onChange={e => setVHor(e.target.value)} placeholder="0" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#1E90FF] transition-all" />
              </div>
              <button 
                disabled={loading}
                className="w-full py-5 bg-[#0A2540] text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-[#1E90FF] transition-all disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Adicionar'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <h3 className="font-black text-[#0A2540] text-xl uppercase tracking-tight flex items-center gap-4 ml-6">
              <div className="w-2 h-8 bg-[#58CC02] rounded-full"></div>
              Lista da Frota
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map(v => (
                <div key={v.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 flex items-center justify-between group hover:border-[#1E90FF] transition-all shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl transition-all ${v.active ? 'bg-[#1E90FF]/10 text-[#1E90FF]' : 'bg-slate-100 text-slate-400'}`}>
                      {v.prefix}
                    </div>
                    <div>
                      <p className="font-black text-[#0A2540] text-xl tracking-tighter">{v.plate}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">KM: {v.current_km}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleVehicleStatus(v)}
                    className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${v.active ? 'bg-[#58CC02]/10 text-[#58CC02] hover:bg-red-50 hover:text-red-600' : 'bg-slate-100 text-slate-400 hover:bg-[#1E90FF]/10 hover:text-[#1E90FF]'}`}
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
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm border-slate-100">
            <h3 className="font-black text-[#0A2540] text-xl mb-8 uppercase flex items-center gap-4">
              <div className="w-2 h-8 bg-[#1E90FF] rounded-full"></div>
              Novo Item Técnico
            </h3>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Descrição</label>
                <input value={iLabel} onChange={e => setILabel(e.target.value)} placeholder="Ex: Faróis de Milha" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#1E90FF] transition-all" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Categoria</label>
                <select value={iCategory} onChange={e => setICategory(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white focus:border-[#1E90FF] transition-all">
                  <option value="MOTOR (VEÍCULO DESLIGADO)">MOTOR (DESLIGADO)</option>
                  <option value="CABINE INTERNA/EXTERNA">CABINE</option>
                  <option value="BAÚ">BAÚ</option>
                  <option value="GERAL">GERAL</option>
                  <option value="VERIFICAR FUNCIONAMENTO">FUNCIONAMENTO</option>
                </select>
              </div>
              <button 
                disabled={loading}
                className="w-full py-5 bg-[#0A2540] text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-[#1E90FF] transition-all disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Salvar Item'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <h3 className="font-black text-[#0A2540] text-xl uppercase tracking-tight flex items-center gap-4 ml-6">
              <div className="w-2 h-8 bg-[#58CC02] rounded-full"></div>
              Configuração do Checklist
            </h3>
            <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">ID</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Descrição Técnica</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Sessão</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] text-right">Controle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.sort((a,b) => a.id - b.id).map(item => (
                      <tr key={item.id} className={`hover:bg-slate-50/30 transition-colors ${item.active === false ? 'opacity-40 grayscale' : ''}`}>
                        <td className="px-10 py-6 text-xs font-black text-slate-200">#{item.id}</td>
                        <td className="px-10 py-6">
                          <p className="text-sm font-black text-[#0A2540] tracking-tight">{item.label}</p>
                        </td>
                        <td className="px-10 py-6">
                          <span className="text-[9px] bg-slate-100 text-slate-400 px-3 py-1.5 rounded-xl font-black uppercase tracking-tighter border border-slate-200">{item.category}</span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button 
                            onClick={() => toggleItemStatus(item)}
                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${item.active !== false ? 'bg-[#58CC02]/10 text-[#58CC02] hover:bg-red-50 hover:text-red-600' : 'bg-slate-100 text-slate-300 hover:bg-[#1E90FF]/10 hover:text-[#1E90FF]'}`}
                          >
                            {item.active !== false ? 'Ativo' : 'Inativo'}
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

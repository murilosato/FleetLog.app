
import React, { useState, useEffect } from 'react';
import { Vehicle, DBChecklistItem, FuelType, LubricantType } from '../types';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  vehicles: Vehicle[];
  items: DBChecklistItem[];
  onRefresh: () => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ vehicles, items, onRefresh, onBack }) => {
  const [tab, setTab] = useState<'vehicles' | 'items' | 'fuels' | 'lubricants'>('vehicles');
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [lubricantTypes, setLubricantTypes] = useState<LubricantType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(true);

  // Global Settings States
  const [globalMaxKm, setGlobalMaxKm] = useState('500');
  const [globalMaxHor, setGlobalMaxHor] = useState('24');

  // Edit States
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Form states (Cadastro)
  const [vPrefix, setVPrefix] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vStartKm, setVStartKm] = useState('');
  const [vStartHor, setVStartHor] = useState('');
  const [vMaxKmJump, setVMaxKmJump] = useState('500');
  const [vMaxHorJump, setVMaxHorJump] = useState('24');
  
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('GERAL');
  const [customCategory, setCustomCategory] = useState('');
  
  const [newFuelName, setNewFuelName] = useState('');
  const [newLubName, setNewLubName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, lRes, sRes] = await Promise.all([
        supabase.from('fuel_types').select('*').order('name'),
        supabase.from('lubricant_types').select('*').order('name'),
        supabase.from('global_settings').select('*')
      ]);
      
      if (fRes.data) setFuelTypes(fRes.data);
      if (lRes.data) setLubricantTypes(lRes.data);
      if (sRes.data) {
        const km = sRes.data.find(s => s.config_key === 'default_max_km_jump');
        const hor = sRes.data.find(s => s.config_key === 'default_max_horimetro_jump');
        if (km) {
          setGlobalMaxKm(km.config_value);
          if (!editingId) setVMaxKmJump(km.config_value);
        }
        if (hor) {
          setGlobalMaxHor(hor.config_value);
          if (!editingId) setVMaxHorJump(hor.config_value);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobalSettings = async () => {
    setLoading(true);
    try {
      await Promise.all([
        supabase.from('global_settings').upsert({ config_key: 'default_max_km_jump', config_value: globalMaxKm }),
        supabase.from('global_settings').upsert({ config_key: 'default_max_horimetro_jump', config_value: globalMaxHor })
      ]);
      alert("Configurações globais atualizadas!");
    } catch (err) {
      alert("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('vehicles').update({
          prefix: editData.prefix,
          plate: editData.plate,
          current_km: Number(editData.current_km),
          current_horimetro: Number(editData.current_horimetro),
          max_km_jump: Number(editData.max_km_jump),
          max_horimetro_jump: Number(editData.max_horimetro_jump),
          active: editData.active
        }).eq('id', editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from('vehicles').insert([{
          prefix: vPrefix,
          plate: vPlate,
          current_km: Number(vStartKm) || 0,
          current_horimetro: Number(vStartHor) || 0,
          max_km_jump: Number(vMaxKmJump) || Number(globalMaxKm),
          max_horimetro_jump: Number(vMaxHorJump) || Number(globalMaxHor),
          active: true
        }]);
        if (error) throw error;
        setVPrefix(''); setVPlate(''); setVStartKm(''); setVStartHor('');
        setVMaxKmJump(globalMaxKm); setVMaxHorJump(globalMaxHor);
      }
      onRefresh();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const category = customCategory || newItemCategory;
    try {
      if (editingId) {
        const { error } = await supabase.from('checklist_items').update({
          label: editData.label,
          category: editData.category,
          active: editData.active
        }).eq('id', editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from('checklist_items').insert([{
          label: newItemLabel,
          category,
          active: true
        }]);
        if (error) throw error;
        setNewItemLabel(''); setCustomCategory('');
      }
      onRefresh();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await supabase.from('fuel_types').update({ name: editData.name }).eq('id', editingId);
        setEditingId(null);
      } else {
        await supabase.from('fuel_types').insert([{ name: newFuelName, active: true }]);
        setNewFuelName('');
      }
      fetchData();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLubricant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await supabase.from('lubricant_types').update({ name: editData.name }).eq('id', editingId);
        setEditingId(null);
      } else {
        await supabase.from('lubricant_types').insert([{ name: newLubName, active: true }]);
        setNewLubName('');
      }
      fetchData();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent, table: string, id: any, currentActiveState: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    const nextState = !currentActiveState;
    const actionLabel = nextState ? 'REATIVAR' : 'DESATIVAR';
    
    if (!confirm(`Deseja realmente ${actionLabel} este item?`)) return;
    
    setProcessingId(id);
    try {
      const formattedId = (table === 'vehicles' || table === 'checklist_items') ? id : Number(id);
      const { error } = await supabase
        .from(table)
        .update({ active: nextState })
        .eq('id', formattedId);
        
      if (error) throw error;
      
      if (table === 'fuel_types' || table === 'lubricant_types') {
        await fetchData();
      } else {
        await onRefresh();
      }
    } catch (err: any) {
      console.error(`Falha ao atualizar ${table}:`, err);
      alert("Erro ao processar solicitação: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category)));

  const LoadingSpinner = () => (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header Gestão */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all active:scale-95">
            <svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-4xl font-black text-[#0A2540] tracking-tight">Gestão</h2>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] w-full lg:w-auto shadow-inner overflow-x-auto hide-scrollbar">
          {['vehicles', 'items', 'fuels', 'lubricants'].map((t) => (
            <button 
              key={t}
              onClick={() => { setTab(t as any); setSearchTerm(''); setEditingId(null); }} 
              className={`flex-1 px-6 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-[#1E90FF] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'vehicles' ? 'Frota' : t === 'items' ? 'Checklist' : t === 'fuels' ? 'Combustível' : 'Lubrificante'}
            </button>
          ))}
        </div>
      </div>

      {/* Busca Centralizada */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
         <div className="flex-1 flex items-center gap-4 bg-slate-50 p-4 rounded-2xl w-full">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={`Pesquisar na aba ${tab}...`} className="bg-transparent border-0 outline-none font-black text-sm w-full text-slate-950" />
         </div>
         <label className="flex items-center gap-3 cursor-pointer group px-4 py-2 hover:bg-slate-50 rounded-xl transition-all">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="w-5 h-5 rounded-md border-2 border-slate-200 text-[#1E90FF] focus:ring-0" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">Mostrar Inativos</span>
         </label>
      </div>

      {tab === 'vehicles' && (
        <div className="space-y-10">
          <div className="bg-white p-8 rounded-[3rem] border shadow-sm border-slate-100">
            <h3 className="font-black text-[#0A2540] text-lg mb-6 uppercase flex items-center gap-3">
              <div className="w-2 h-6 bg-[#1E90FF] rounded-full"></div>
              {editingId ? 'Editar Veículo' : 'Novo Veículo'}
            </h3>
            <form onSubmit={handleSaveVehicle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prefixo</label>
                <input value={editingId ? editData.prefix : vPrefix} onChange={e => editingId ? setEditData({...editData, prefix: e.target.value}) : setVPrefix(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-slate-950 text-sm outline-none border-2 border-transparent focus:border-[#1E90FF] transition-all" required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa</label>
                <input value={editingId ? editData.plate : vPlate} onChange={e => editingId ? setEditData({...editData, plate: e.target.value}) : setVPlate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-slate-950 text-sm outline-none border-2 border-transparent focus:border-[#1E90FF] transition-all" required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">KM Atual</label>
                <input type="number" value={editingId ? editData.current_km : vStartKm} onChange={e => editingId ? setEditData({...editData, current_km: e.target.value}) : setVStartKm(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-slate-950 text-sm outline-none border-2 border-transparent focus:border-[#1E90FF] transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Horímetro</label>
                <input type="number" value={editingId ? editData.current_horimetro : vStartHor} onChange={e => editingId ? setEditData({...editData, current_horimetro: e.target.value}) : setVStartHor(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-slate-950 text-sm outline-none border-2 border-transparent focus:border-[#1E90FF] transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pulo Máx KM</label>
                <input type="number" value={editingId ? editData.max_km_jump : vMaxKmJump} onChange={e => editingId ? setEditData({...editData, max_km_jump: e.target.value}) : setVMaxKmJump(e.target.value)} className="w-full p-4 bg-blue-50/50 rounded-2xl font-black text-slate-950 text-sm outline-none border-2 border-blue-100 focus:border-[#1E90FF] transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pulo Máx Horímetro</label>
                <input type="number" value={editingId ? editData.max_horimetro_jump : vMaxHorJump} onChange={e => editingId ? setEditData({...editData, max_horimetro_jump: e.target.value}) : setVMaxHorJump(e.target.value)} className="w-full p-4 bg-blue-50/50 rounded-2xl font-black text-slate-950 text-sm outline-none border-2 border-blue-100 focus:border-[#1E90FF] transition-all" />
              </div>
              <div className="lg:col-span-3 flex gap-3 pt-4">
                {editingId && <button type="button" onClick={() => {setEditingId(null); setEditData({});}} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase">Cancelar</button>}
                <button type="submit" className="flex-1 py-4 bg-[#1E90FF] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">{editingId ? 'Salvar Edição' : 'Cadastrar Veículo'}</button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.filter(v => (showInactive || v.active !== false) && (v.prefix.toLowerCase().includes(searchTerm.toLowerCase()) || v.plate.toLowerCase().includes(searchTerm.toLowerCase()))).map(v => {
              const isActive = v.active !== false;
              return (
                <div key={v.id} className={`p-6 rounded-[2.5rem] border-2 shadow-sm flex flex-col transition-all duration-300 ${!isActive ? 'bg-slate-100 border-slate-200 opacity-50 grayscale' : 'bg-white border-white'}`}>
                  <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className={`text-2xl font-black ${!isActive ? 'text-slate-400' : 'text-[#0A2540]'}`}>{v.prefix}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.plate}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingId(v.id); setEditData(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2.5 bg-white rounded-xl text-blue-500 shadow-md border border-slate-100 hover:scale-110 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button onClick={(e) => handleToggleStatus(e, 'vehicles', v.id, isActive)} className={`p-2.5 rounded-xl shadow-md border border-slate-100 hover:scale-110 transition-transform ${isActive ? 'bg-white text-red-500' : 'bg-[#1E90FF] text-white'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </button>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-auto">
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase">KM Atual</p>
                      <p className="text-sm font-black text-slate-950">{v.current_km}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Horímetro</p>
                      <p className="text-sm font-black text-slate-950">{v.current_horimetro}</p>
                    </div>
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-50">
                      <p className="text-[8px] font-black text-blue-400 uppercase">Jump Máx KM</p>
                      <p className="text-xs font-black text-slate-950">{v.max_km_jump}</p>
                    </div>
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-50">
                      <p className="text-[8px] font-black text-blue-400 uppercase">Jump Máx Hor</p>
                      <p className="text-xs font-black text-slate-950">{v.max_horimetro_jump}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-10 animate-in fade-in">
           <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm border-slate-100">
             <h3 className="font-black text-[#0A2540] text-xl mb-8 uppercase flex items-center gap-4">
               <div className="w-2 h-8 bg-[#1E90FF] rounded-full"></div>
               {editingId ? 'Editar Item' : 'Novo Item de Checklist'}
             </h3>
             <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                <div className="lg:col-span-2 space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Item</label>
                   <input value={editingId ? editData.label : newItemLabel} onChange={e => editingId ? setEditData({...editData, label: e.target.value}) : setNewItemLabel(e.target.value)} placeholder="Ex: Nível de Óleo" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-slate-950 text-sm outline-none border-2 border-transparent focus:border-[#1E90FF] transition-all" required />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                   <select value={editingId ? editData.category : newItemCategory} onChange={e => editingId ? setEditData({...editData, category: e.target.value}) : setNewItemCategory(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-slate-950 text-sm outline-none">
                     <option value="NOVA">-- CRIAR NOVA --</option>
                     {categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                {(newItemCategory === 'NOVA' || (editingId && !categories.includes(editData.category))) && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#1E90FF] uppercase tracking-widest ml-1">Nome Categoria</label>
                    <input value={editingId ? editData.category : customCategory} onChange={e => editingId ? setEditData({...editData, category: e.target.value}) : setCustomCategory(e.target.value)} placeholder="Categoria Personalizada" className="w-full p-4 bg-blue-50 rounded-2xl font-black text-slate-950 text-sm outline-none border border-blue-100" required />
                  </div>
                )}
                <div className="lg:col-span-4 flex gap-3 pt-4">
                   {editingId && <button type="button" onClick={() => setEditingId(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase">Cancelar</button>}
                   <button type="submit" className="flex-1 py-4 bg-[#0A2540] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">{editingId ? 'Salvar Alterações' : 'Cadastrar Item'}</button>
                </div>
             </form>
           </div>

           <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="space-y-10">
                {categories.map(cat => {
                  const catItems = items.filter(i => i.category === cat && (showInactive || i.active !== false) && i.label.toLowerCase().includes(searchTerm.toLowerCase()));
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-4">
                      <h4 className="text-[11px] font-black text-[#1E90FF] uppercase tracking-[0.2em] ml-2">{cat}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {catItems.map(item => (
                          <div key={item.id} className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${item.active === false ? 'bg-slate-50 border-slate-100 opacity-50 grayscale' : 'bg-white border-slate-50 shadow-sm'}`}>
                            <div className="flex flex-col flex-1 truncate pr-4">
                               <span className="text-[11px] font-black text-slate-950 truncate leading-tight">{item.label}</span>
                               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {item.id}</span>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => { setEditingId(item.id); setEditData(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 bg-slate-100 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                               </button>
                               <button onClick={(e) => handleToggleStatus(e, 'checklist_items', item.id, item.active !== false)} className={`p-2 rounded-lg transition-colors ${item.active !== false ? 'bg-slate-100 text-red-500 hover:bg-red-50' : 'bg-[#1E90FF] text-white'}`}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      )}

      {(tab === 'fuels' || tab === 'lubricants') && (
        <div className="space-y-10 animate-in fade-in">
           <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm border-slate-100">
             <h3 className="font-black text-[#0A2540] text-xl mb-8 uppercase flex items-center gap-4">
               <div className={`w-2 h-8 rounded-full ${tab === 'fuels' ? 'bg-[#58CC02]' : 'bg-[#FFA500]'}`}></div>
               {editingId ? 'Editar Insumo' : `Novo ${tab === 'fuels' ? 'Combustível' : 'Lubrificante'}`}
             </h3>
             <form onSubmit={tab === 'fuels' ? handleSaveFuel : handleSaveLubricant} className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Insumo</label>
                   <input value={editingId ? editData.name : (tab === 'fuels' ? newFuelName : newLubName)} onChange={e => editingId ? setEditData({...editData, name: e.target.value}) : (tab === 'fuels' ? setNewFuelName(e.target.value) : setNewLubName(e.target.value))} placeholder="Ex: Diesel S10" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-slate-950 text-sm outline-none border-2 border-transparent focus:border-[#1E90FF] transition-all" required />
                </div>
                <div className="flex gap-3">
                   {editingId && <button type="button" onClick={() => {setEditingId(null); setEditData({});}} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>}
                   <button type="submit" className={`px-10 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${tab === 'fuels' ? 'bg-[#58CC02]' : 'bg-[#FFA500]'}`}>{editingId ? 'Salvar' : 'Cadastrar'}</button>
                </div>
             </form>
           </div>

           <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(tab === 'fuels' ? fuelTypes : lubricantTypes).filter(t => (showInactive || t.active !== false) && t.name.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                <div key={t.id} className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between ${t.active === false ? 'bg-slate-50 border-slate-100 opacity-50 grayscale' : 'bg-white border-slate-50 shadow-sm'}`}>
                  <div className="flex flex-col flex-1 truncate pr-4">
                     <span className="text-[13px] font-black text-slate-950 truncate uppercase tracking-tight">{t.name}</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {t.id}</span>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => { setEditingId(t.id); setEditData(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2.5 bg-slate-100 rounded-xl text-blue-500 hover:bg-blue-50 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                     </button>
                     <button onClick={(e) => handleToggleStatus(e, tab === 'fuels' ? 'fuel_types' : 'lubricant_types', t.id, t.active !== false)} className={`p-2.5 rounded-xl transition-all ${t.active !== false ? 'bg-slate-100 text-red-500 hover:bg-red-50' : 'bg-[#1E90FF] text-white'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                     </button>
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

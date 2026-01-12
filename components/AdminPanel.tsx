
import React, { useState, useEffect } from 'react';
import { Vehicle, DBChecklistItem, User, FuelType, LubricantType } from '../types';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  vehicles: Vehicle[];
  items: DBChecklistItem[];
  onRefresh: () => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ vehicles, items, onRefresh, onBack }) => {
  const [tab, setTab] = useState<'vehicles' | 'items' | 'fuels' | 'users'>('vehicles');
  const [loading, setLoading] = useState(false);
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [lubricantTypes, setLubricantTypes] = useState<LubricantType[]>([]);
  const [editingId, setEditingId] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'fuels') fetchInsumos();
  }, [tab]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('name');
    if (data) setDbUsers(data as User[]);
    setLoading(false);
  };

  const fetchInsumos = async () => {
    setLoading(true);
    const [fRes, lRes] = await Promise.all([
      supabase.from('fuel_types').select('*').order('name'),
      supabase.from('lubricant_types').select('*').order('name')
    ]);
    if (fRes.data) setFuelTypes(fRes.data);
    if (lRes.data) setLubricantTypes(lRes.data);
    setLoading(false);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await supabase.from('users').update(editData).eq('id', editingId);
      } else {
        await supabase.from('users').insert([editData]);
      }
      setEditingId(null);
      setEditData({});
      fetchUsers();
    } catch (err) {
      alert("Erro ao salvar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (table: string, id: any, currentState: boolean) => {
    if (!confirm("Alterar status deste registro?")) return;
    const { error } = await supabase.from(table).update({ active: !currentState }).eq('id', id);
    if (!error) {
      if (table === 'users') fetchUsers();
      else if (table === 'fuel_types' || table === 'lubricant_types') fetchInsumos();
      else onRefresh();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
            <svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-3xl font-black text-[#0A2540] tracking-tight uppercase">Gestão Master</h2>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] w-full lg:w-auto shadow-inner overflow-x-auto hide-scrollbar gap-1">
          {['vehicles', 'items', 'fuels', 'users'].map((t) => (
            <button 
              key={t}
              onClick={() => { setTab(t as any); setEditingId(null); }} 
              className={`flex-1 px-8 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-[#1E90FF] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'vehicles' ? 'Frota' : t === 'items' ? 'Checklist' : t === 'fuels' ? 'Insumos' : 'Usuários'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'users' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <h3 className="font-black text-[#0A2540] text-xl mb-8 uppercase flex items-center gap-4">
               <div className="w-2 h-8 bg-[#1E90FF] rounded-full"></div>
               {editingId ? 'Editar Usuário' : 'Novo Usuário Operacional'}
            </h3>
            <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <input placeholder="Nome Completo" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none focus:border-[#1E90FF] border-2 border-transparent" required />
              <input placeholder="Usuário (Login)" value={editData.username || ''} onChange={e => setEditData({...editData, username: e.target.value})} className="p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent" required />
              <input placeholder="Matrícula" value={editData.matricula || ''} onChange={e => setEditData({...editData, matricula: e.target.value})} className="p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent" required />
              <select value={editData.role || 'OPERADOR'} onChange={e => setEditData({...editData, role: e.target.value})} className="p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none">
                <option value="OPERADOR">Motorista</option>
                <option value="MANUTENCAO">Mecânico</option>
                <option value="OPERACAO">Fiscal Op.</option>
                <option value="ADMIN">Administrador</option>
              </select>
              <div className="lg:col-span-4 flex gap-4">
                <button type="submit" className="flex-1 py-5 bg-[#0A2540] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl">{editingId ? 'Salvar Alteração' : 'Cadastrar'}</button>
                {editingId && <button onClick={() => setEditingId(null)} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-[1.5rem] font-black text-xs uppercase tracking-widest">Cancelar</button>}
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {dbUsers.map(u => (
              <div key={u.id} className={`p-6 bg-white rounded-[2.5rem] border-2 shadow-sm flex flex-col justify-between transition-all ${!u.active ? 'opacity-40 grayscale' : 'border-white'}`}>
                <div>
                   <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded uppercase tracking-widest">{u.role}</span>
                   <h4 className="text-xl font-black text-[#0A2540] mt-3 leading-tight uppercase">{u.name}</h4>
                   <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Login: {u.username}</p>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => { setEditingId(u.id); setEditData(u); }} className="flex-1 py-3 bg-slate-50 text-blue-600 rounded-xl font-black text-[9px] uppercase border border-blue-50">Editar</button>
                  <button onClick={() => handleToggleStatus('users', u.id, u.active)} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase ${u.active ? 'bg-red-50 text-red-600' : 'bg-green-600 text-white'}`}>{u.active ? 'Desativar' : 'Ativar'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'vehicles' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-6">Prefixo / Placa</th>
                    <th className="px-8 py-6">KM Atual</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {vehicles.map(v => (
                   <tr key={v.id} className={`hover:bg-slate-50 transition-colors ${!v.active ? 'opacity-40' : ''}`}>
                      <td className="px-8 py-5">
                         <p className="font-black text-[#0A2540] text-sm">{v.prefix}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase">{v.plate}</p>
                      </td>
                      <td className="px-8 py-5">
                         <p className="font-tech font-bold text-slate-600">{v.current_km} KM</p>
                         <p className="text-[8px] font-bold text-slate-300 uppercase">HOR: {v.current_horimetro}</p>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${v.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{v.active ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <button onClick={() => handleToggleStatus('vehicles', v.id, v.active)} className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all ${v.active ? 'bg-slate-50 text-red-600' : 'bg-green-600 text-white'}`}>{v.active ? 'Desativar' : 'Ativar'}</button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {tab === 'items' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-6">Item de Inspeção</th>
                    <th className="px-8 py-6">Categoria</th>
                    <th className="px-8 py-6 text-right">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {items.map(i => (
                   <tr key={i.id} className={`hover:bg-slate-50 transition-colors ${i.active === false ? 'opacity-40' : ''}`}>
                      <td className="px-8 py-5">
                         <p className="font-black text-[#0A2540] text-sm">[{i.id}] {i.label}</p>
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">{i.category}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <button onClick={() => handleToggleStatus('checklist_items', i.id, i.active !== false)} className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all ${i.active !== false ? 'bg-slate-50 text-red-600' : 'bg-green-600 text-white'}`}>{i.active !== false ? 'Ocultar' : 'Mostrar'}</button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {tab === 'fuels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              <h4 className="p-8 pb-4 font-black text-[#0A2540] text-lg uppercase">Combustíveis</h4>
              <table className="w-full text-left">
                 <tbody className="divide-y divide-slate-50">
                    {fuelTypes.map(f => (
                      <tr key={f.id} className={`hover:bg-slate-50 transition-colors ${!f.active ? 'opacity-40' : ''}`}>
                         <td className="px-8 py-4 font-black text-[#0A2540] text-xs uppercase">{f.name}</td>
                         <td className="px-8 py-4 text-right">
                            <button onClick={() => handleToggleStatus('fuel_types', f.id, f.active)} className={`text-[8px] font-black px-3 py-1.5 rounded-lg transition-all ${f.active ? 'bg-slate-50 text-red-600' : 'bg-green-600 text-white'}`}>{f.active ? 'Desativar' : 'Ativar'}</button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              <h4 className="p-8 pb-4 font-black text-[#0A2540] text-lg uppercase">Lubrificantes</h4>
              <table className="w-full text-left">
                 <tbody className="divide-y divide-slate-50">
                    {lubricantTypes.map(l => (
                      <tr key={l.id} className={`hover:bg-slate-50 transition-colors ${!l.active ? 'opacity-40' : ''}`}>
                         <td className="px-8 py-4 font-black text-[#0A2540] text-xs uppercase">{l.name}</td>
                         <td className="px-8 py-4 text-right">
                            <button onClick={() => handleToggleStatus('lubricant_types', l.id, l.active)} className={`text-[8px] font-black px-3 py-1.5 rounded-lg transition-all ${l.active ? 'bg-slate-50 text-red-600' : 'bg-green-600 text-white'}`}>{l.active ? 'Desativar' : 'Ativar'}</button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

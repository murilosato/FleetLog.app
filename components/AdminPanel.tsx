
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editingId, setEditingId] = useState<any>(null);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let table = '';
    if (tab === 'vehicles') table = 'vehicles';
    else if (tab === 'items') table = 'checklist_items';
    else if (tab === 'users') table = 'users';
    else {
      table = editData._type === 'fuel' ? 'fuel_types' : 'lubricant_types';
      delete editData._type;
    }

    try {
      if (editingId) {
        await supabase.from(table).update(editData).eq('id', editingId);
      } else {
        await supabase.from(table).insert([editData]);
      }
      setIsEditing(false);
      setEditData({});
      setEditingId(null);
      if (tab === 'users') fetchUsers();
      else if (tab === 'fuels') fetchInsumos();
      else onRefresh();
    } catch (err) {
      alert("Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (table: string, id: any, currentState: boolean) => {
    if (!confirm("Confirmar alteração de status?")) return;
    const { error } = await supabase.from(table).update({ active: !currentState }).eq('id', id);
    if (!error) {
      if (table === 'users') fetchUsers();
      else if (table === 'fuel_types' || table === 'lubricant_types') fetchInsumos();
      else onRefresh();
    }
  };

  const openNew = () => {
    setEditingId(null);
    let initial: any = { active: true };
    if (tab === 'fuels') initial._type = 'fuel';
    if (tab === 'items') initial.category = 'GERAL';
    if (tab === 'vehicles') {
       initial.max_km_jump = 500;
       initial.max_horimetro_jump = 24;
    }
    setEditData(initial);
    setIsEditing(true);
  };

  const openEdit = (item: any, type?: string) => {
    setEditingId(item.id);
    setEditData({ ...item, _type: type });
    setIsEditing(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all shadow-sm"><svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2.5"/></svg></button>
          <h2 className="text-3xl font-black text-[#0A2540] uppercase tracking-tight">Gestão Master</h2>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] w-full lg:w-auto shadow-inner overflow-x-auto hide-scrollbar gap-1">
          {['vehicles', 'items', 'fuels', 'users'].map((t) => (
            <button key={t} onClick={() => { setTab(t as any); setIsEditing(false); }} className={`flex-1 px-10 py-4 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-[#00548b] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              {t === 'vehicles' ? 'Frota' : t === 'items' ? 'Checklist' : t === 'fuels' ? 'Insumos' : 'Usuários'}
            </button>
          ))}
        </div>
      </div>

      {!isEditing && (
        <div className="flex justify-end px-4">
           <button onClick={openNew} className="px-8 py-4 bg-[#58CC02] text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              Adicionar Novo
           </button>
        </div>
      )}

      {isEditing ? (
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm animate-in zoom-in-95 max-w-2xl mx-auto">
           <h3 className="text-2xl font-black text-[#0A2540] mb-10 uppercase">{editingId ? 'Editar Registro' : 'Novo Cadastro'}</h3>
           <form onSubmit={handleSave} className="space-y-6">
              {tab === 'vehicles' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Prefixo (Ex: 1.1.5.01)" value={editData.prefix || ''} onChange={e => setEditData({...editData, prefix: e.target.value})} className="p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" required />
                    <input placeholder="Placa" value={editData.plate || ''} onChange={e => setEditData({...editData, plate: e.target.value})} className="p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <input type="number" placeholder="KM Atual" value={editData.current_km || ''} onChange={e => setEditData({...editData, current_km: Number(e.target.value)})} className="p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" />
                     <input type="number" placeholder="HOR Atual" value={editData.current_horimetro || ''} onChange={e => setEditData({...editData, current_horimetro: Number(e.target.value)})} className="p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" />
                  </div>
                  <div className="space-y-3 p-6 bg-slate-50 rounded-3xl border">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Variações Máximas (Bloqueio)</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase ml-2">Máx KM Pulo</label>
                          <input type="number" value={editData.max_km_jump || 500} onChange={e => setEditData({...editData, max_km_jump: Number(e.target.value)})} className="w-full p-4 bg-white rounded-xl font-bold text-sm border outline-none focus:border-[#00548b]" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase ml-2">Máx HOR Pulo</label>
                          <input type="number" value={editData.max_horimetro_jump || 24} onChange={e => setEditData({...editData, max_horimetro_jump: Number(e.target.value)})} className="w-full p-4 bg-white rounded-xl font-bold text-sm border outline-none focus:border-[#00548b]" />
                        </div>
                     </div>
                  </div>
                </>
              )}
              {tab === 'items' && (
                <>
                  <input placeholder="Rótulo / Descrição do Item" value={editData.label || ''} onChange={e => setEditData({...editData, label: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" required />
                  <input placeholder="Categoria (MOTOR, CABINE, etc)" value={editData.category || ''} onChange={e => setEditData({...editData, category: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" required />
                </>
              )}
              {tab === 'fuels' && (
                <>
                  <select value={editData._type} onChange={e => setEditData({...editData, _type: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none mb-4">
                    <option value="fuel">Combustível</option>
                    <option value="lubricant">Lubrificante</option>
                  </select>
                  <input placeholder="Nome do Insumo" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" required />
                </>
              )}
              {tab === 'users' && (
                <>
                  <input placeholder="Nome Completo" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" required />
                  <input placeholder="Login" value={editData.username || ''} onChange={e => setEditData({...editData, username: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Matrícula" value={editData.matricula || ''} onChange={e => setEditData({...editData, matricula: e.target.value})} className="p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none" required />
                    <select value={editData.role || 'OPERADOR'} onChange={e => setEditData({...editData, role: e.target.value})} className="p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none">
                      <option value="ADMIN">Administrador</option>
                      <option value="OPERADOR">Motorista</option>
                      <option value="MANUTENCAO">Mecânico</option>
                      <option value="OPERACAO">Fiscal Op.</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-bold text-[11px] uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-1 py-5 bg-[#00548b] text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-xl">Salvar Registro</button>
              </div>
           </form>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="py-40 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest animate-pulse">Sincronizando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-10 py-7">Identificação / Nome</th>
                    <th className="px-10 py-7">Configurações Base</th>
                    <th className="px-10 py-7 text-center">Status</th>
                    <th className="px-10 py-7 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tab === 'vehicles' && vehicles.map(v => (
                    <tr key={v.id} className={`hover:bg-slate-50/50 transition-colors ${!v.active ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-10 py-6"><p className="font-bold text-[#0A2540] text-lg uppercase">{v.prefix}</p></td>
                      <td className="px-10 py-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.plate} | {v.current_km} KM</p>
                        <p className="text-[8px] font-black text-[#00548b] uppercase tracking-tighter mt-1">Bloqueio: {v.max_km_jump || 500}km / {v.max_horimetro_jump || 24}h</p>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${v.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{v.active ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-end gap-3 items-center">
                          <button onClick={() => openEdit(v)} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                          <button onClick={() => handleToggleStatus('vehicles', v.id, v.active)} className={`text-[10px] font-bold px-6 py-2 rounded-xl transition-all shadow-sm ${v.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{v.active ? 'Inativar' : 'Ativar'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tab === 'items' && items.map(i => (
                    <tr key={i.id} className={`hover:bg-slate-50/50 transition-colors ${i.active === false ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-10 py-6"><p className="font-bold text-[#0A2540] text-sm uppercase">[{i.id.toString().padStart(2, '0')}] {i.label}</p></td>
                      <td className="px-10 py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{i.category}</p></td>
                      <td className="px-10 py-6 text-center">
                        <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${i.active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{i.active !== false ? 'Ativo' : 'Oculto'}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-end gap-3 items-center">
                          <button onClick={() => openEdit(i)} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                          <button onClick={() => handleToggleStatus('checklist_items', i.id, i.active !== false)} className={`text-[10px] font-bold px-6 py-2 rounded-xl transition-all shadow-sm ${i.active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{i.active !== false ? 'Inativar' : 'Exibir'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tab === 'fuels' && [...fuelTypes.map(f => ({...f, _t: 'fuel'})), ...lubricantTypes.map(l => ({...l, _t: 'lubricant'}))].map((ins: any) => (
                    <tr key={ins.id} className={`hover:bg-slate-50/50 transition-colors ${!ins.active ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-10 py-6"><p className="font-bold text-[#0A2540] text-sm uppercase">{ins.name}</p></td>
                      <td className="px-10 py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ins._t === 'fuel' ? 'Combustível' : 'Lubrificante'}</p></td>
                      <td className="px-10 py-6 text-center">
                        <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${ins.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{ins.active ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-3 items-center">
                          <button onClick={() => openEdit(ins, ins._t)} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                          <button onClick={() => handleToggleStatus(ins._t === 'fuel' ? 'fuel_types' : 'lubricant_types', ins.id, ins.active)} className={`text-[10px] font-bold px-6 py-2 rounded-xl transition-all shadow-sm ${ins.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{ins.active ? 'Bloquear' : 'Liberar'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tab === 'users' && dbUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${!u.active ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-10 py-6"><p className="font-bold text-[#0A2540] text-sm uppercase">{u.name}</p></td>
                      <td className="px-10 py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role} | MAT: {u.matricula}</p></td>
                      <td className="px-10 py-6 text-center">
                        <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${u.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{u.active ? 'Ativo' : 'Suspenso'}</span>
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex justify-end gap-3 items-center">
                           <button onClick={() => openEdit(u)} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                           <button onClick={() => handleToggleStatus('users', u.id, u.active)} className={`text-[10px] font-bold px-6 py-2 rounded-xl transition-all shadow-sm ${u.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{u.active ? 'Suspender' : 'Reativar'}</button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;


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
    if (tab === 'vehicles' || tab === 'items') onRefresh();
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
    const payload = { ...editData };
    
    if (tab === 'vehicles') table = 'vehicles';
    else if (tab === 'items') table = 'checklist_items';
    else if (tab === 'users') table = 'users';
    else if (tab === 'fuels') {
      table = payload._type === 'fuel' ? 'fuel_types' : 'lubricant_types';
      delete payload._type; // Remover campo auxiliar do formulário
    }

    try {
      if (editingId) {
        const { error } = await supabase.from(table).update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert([payload]);
        if (error) throw error;
      }
      
      setIsEditing(false);
      setEditData({});
      setEditingId(null);
      
      if (tab === 'users') fetchUsers();
      else if (tab === 'fuels') fetchInsumos();
      else onRefresh();
      
    } catch (err: any) {
      alert("Erro ao salvar dados: " + err.message);
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
    if (tab === 'users') initial.role = 'OPERADOR';
    setEditData(initial);
    setIsEditing(true);
  };

  const openEdit = (item: any, type?: string) => {
    setEditingId(item.id);
    const dataToEdit = { ...item };
    if (tab === 'fuels' && type) {
      dataToEdit._type = type;
    }
    setEditData(dataToEdit);
    setIsEditing(true);
  };

  const renderLabel = (text: string) => (
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">
      {text}
    </label>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={onBack} className="p-3 sm:p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all shadow-sm">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2.5"/></svg>
          </button>
          <h2 className="text-xl sm:text-3xl font-black text-[#0A2540] uppercase tracking-tight">Gestão Master</h2>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] sm:rounded-[2rem] w-full lg:w-auto shadow-inner overflow-x-auto hide-scrollbar gap-1">
          {['vehicles', 'items', 'fuels', 'users'].map((t) => (
            <button key={t} onClick={() => { setTab(t as any); setIsEditing(false); }} className={`flex-1 px-6 sm:px-10 py-3 sm:py-4 rounded-[1.2rem] sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-[#00548b] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              {t === 'vehicles' ? 'Frota' : t === 'items' ? 'Checklist' : t === 'fuels' ? 'Insumos' : 'Usuários'}
            </button>
          ))}
        </div>
      </div>

      {!isEditing && (
        <div className="flex justify-end px-4">
           <button onClick={openNew} className="w-full sm:w-auto px-8 py-4 bg-[#58CC02] text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              Adicionar Novo
           </button>
        </div>
      )}

      {isEditing ? (
        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-100 shadow-sm animate-in zoom-in-95 max-w-2xl mx-auto">
           <h3 className="text-xl sm:text-2xl font-black text-[#0A2540] mb-8 sm:mb-10 uppercase">{editingId ? 'Editar Registro' : 'Novo Cadastro'}</h3>
           <form onSubmit={handleSave} className="space-y-5 sm:space-y-6">
              {tab === 'vehicles' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      {renderLabel("Prefixo do Veículo")}
                      <input placeholder="Ex: 1.1.5.01" value={editData.prefix || ''} onChange={e => setEditData({...editData, prefix: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" required />
                    </div>
                    <div>
                      {renderLabel("Placa")}
                      <input placeholder="Ex: ABC-1234" value={editData.plate || ''} onChange={e => setEditData({...editData, plate: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       {renderLabel("Kilometragem Atual")}
                       <input type="number" placeholder="0" value={editData.current_km || ''} onChange={e => setEditData({...editData, current_km: Number(e.target.value)})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" />
                     </div>
                     <div>
                       {renderLabel("Horímetro Atual")}
                       <input type="number" placeholder="0" value={editData.current_horimetro || ''} onChange={e => setEditData({...editData, current_horimetro: Number(e.target.value)})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" />
                     </div>
                  </div>
                </>
              )}
              {tab === 'items' && (
                <>
                  <div>
                    {renderLabel("Descrição do Item do Checklist")}
                    <input placeholder="Ex: Nível de Óleo" value={editData.label || ''} onChange={e => setEditData({...editData, label: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" required />
                  </div>
                  <div>
                    {renderLabel("Categoria / Agrupamento")}
                    <input placeholder="Ex: MOTOR, CABINE, etc" value={editData.category || ''} onChange={e => setEditData({...editData, category: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" required />
                  </div>
                </>
              )}
              {tab === 'fuels' && (
                <>
                  <div>
                    {renderLabel("Tipo de Registro")}
                    <select value={editData._type} onChange={e => setEditData({...editData, _type: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all mb-1">
                      <option value="fuel">Combustível</option>
                      <option value="lubricant">Lubrificante / Insumo</option>
                    </select>
                  </div>
                  <div>
                    {renderLabel("Nome do Insumo")}
                    <input placeholder="Ex: Diesel S10, Óleo 15W40" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" required />
                  </div>
                </>
              )}
              {tab === 'users' && (
                <>
                  <div>
                    {renderLabel("Nome Completo")}
                    <input placeholder="Ex: João da Silva" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" required />
                  </div>
                  <div>
                    {renderLabel("Usuário de Acesso (E-mail)")}
                    <input type="email" placeholder="Ex: joao@empresa.com" value={editData.username || ''} onChange={e => setEditData({...editData, username: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      {renderLabel("Matrícula")}
                      <input placeholder="Ex: 12345" value={editData.matricula || ''} onChange={e => setEditData({...editData, matricula: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all" required />
                    </div>
                    <div>
                      {renderLabel("Perfil")}
                      <select value={editData.role || 'OPERADOR'} onChange={e => setEditData({...editData, role: e.target.value})} className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00548b] transition-all">
                        <option value="OPERADOR">Operador / Motorista</option>
                        <option value="MANUTENCAO">Oficina / Mecânico</option>
                        <option value="OPERACAO">Fiscal / Operação</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 sm:py-5 bg-slate-100 text-slate-400 rounded-2xl font-bold text-[10px] sm:text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-4 sm:py-5 bg-[#00548b] text-white rounded-2xl font-bold text-[10px] sm:text-[11px] uppercase tracking-widest shadow-xl hover:bg-[#00436e] transition-colors">Salvar Registro</button>
              </div>
           </form>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="py-40 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest animate-pulse">Sincronizando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 sm:px-10 py-5 sm:py-7">Identificação / Nome</th>
                    <th className="px-6 sm:px-10 py-5 sm:py-7">Configurações / Info</th>
                    <th className="px-6 sm:px-10 py-5 sm:py-7 text-center">Status</th>
                    <th className="px-6 sm:px-10 py-5 sm:py-7 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tab === 'vehicles' && (vehicles || []).map(v => (
                    <tr key={v.id} className={`hover:bg-slate-50/50 transition-colors ${v.active === false ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-6 sm:px-10 py-4 sm:py-6"><p className="font-bold text-[#0A2540] text-lg uppercase">{v.prefix}</p></td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.plate} | {v.current_km} KM</p>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-center">
                        <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${v.active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{v.active !== false ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6">
                        <div className="flex justify-end gap-3 items-center">
                          <button onClick={() => openEdit(v)} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                          <button onClick={() => handleToggleStatus('vehicles', v.id, v.active !== false)} className={`text-[10px] font-bold px-5 sm:px-6 py-2 rounded-xl transition-all shadow-sm ${v.active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{v.active !== false ? 'Inativar' : 'Ativar'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tab === 'items' && (items || []).map(i => (
                    <tr key={i.id} className={`hover:bg-slate-50/50 transition-colors ${i.active === false ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-6 sm:px-10 py-4 sm:py-6"><p className="font-bold text-[#0A2540] text-sm uppercase">[{i.id.toString().padStart(2, '0')}] {i.label}</p></td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{i.category}</p></td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-center">
                        <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${i.active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{i.active !== false ? 'Ativo' : 'Oculto'}</span>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6">
                        <div className="flex justify-end gap-3 items-center">
                          <button onClick={() => openEdit(i)} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                          <button onClick={() => handleToggleStatus('checklist_items', i.id, i.active !== false)} className={`text-[10px] font-bold px-5 sm:px-6 py-2 rounded-xl transition-all shadow-sm ${i.active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{i.active !== false ? 'Inativar' : 'Exibir'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tab === 'fuels' && (
                    <>
                      {fuelTypes.map(f => (
                        <tr key={`f-${f.id}`} className={`hover:bg-slate-50/50 transition-colors ${f.active === false ? 'opacity-40 grayscale' : ''}`}>
                          <td className="px-6 sm:px-10 py-4 sm:py-6"><p className="font-bold text-[#0A2540] text-sm uppercase">{f.name}</p></td>
                          <td className="px-6 sm:px-10 py-4 sm:py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Combustível</p></td>
                          <td className="px-6 sm:px-10 py-4 sm:py-6 text-center">
                            <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${f.active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{f.active !== false ? 'Ativo' : 'Inativo'}</span>
                          </td>
                          <td className="px-6 sm:px-10 py-4 sm:py-6">
                            <div className="flex justify-end gap-3 items-center">
                              <button onClick={() => openEdit(f, 'fuel')} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                              <button onClick={() => handleToggleStatus('fuel_types', f.id, f.active !== false)} className={`text-[10px] font-bold px-5 sm:px-6 py-2 rounded-xl transition-all shadow-sm ${f.active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{f.active !== false ? 'Inativar' : 'Ativar'}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {lubricantTypes.map(l => (
                        <tr key={`l-${l.id}`} className={`hover:bg-slate-50/50 transition-colors ${l.active === false ? 'opacity-40 grayscale' : ''}`}>
                          <td className="px-6 sm:px-10 py-4 sm:py-6"><p className="font-bold text-[#0A2540] text-sm uppercase">{l.name}</p></td>
                          <td className="px-6 sm:px-10 py-4 sm:py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lubrificante</p></td>
                          <td className="px-6 sm:px-10 py-4 sm:py-6 text-center">
                            <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${l.active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{l.active !== false ? 'Ativo' : 'Inativo'}</span>
                          </td>
                          <td className="px-6 sm:px-10 py-4 sm:py-6">
                            <div className="flex justify-end gap-3 items-center">
                              <button onClick={() => openEdit(l, 'lubricant')} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                              <button onClick={() => handleToggleStatus('lubricant_types', l.id, l.active !== false)} className={`text-[10px] font-bold px-5 sm:px-6 py-2 rounded-xl transition-all shadow-sm ${l.active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{l.active !== false ? 'Inativar' : 'Ativar'}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                  {tab === 'users' && dbUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.active === false ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-6 sm:px-10 py-4 sm:py-6">
                        <p className="font-bold text-[#0A2540] text-sm uppercase">{u.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold lowercase">{u.username}</p>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role} | MAT: {u.matricula}</p>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-center">
                        <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase inline-block ${u.active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{u.active !== false ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6">
                        <div className="flex justify-end gap-3 items-center">
                          <button onClick={() => openEdit(u)} className="text-[10px] font-bold text-[#1E90FF] uppercase tracking-widest hover:underline">Editar</button>
                          <button onClick={() => handleToggleStatus('users', u.id, u.active !== false)} className={`text-[10px] font-bold px-5 sm:px-6 py-2 rounded-xl transition-all shadow-sm ${u.active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{u.active !== false ? 'Inativar' : 'Ativar'}</button>
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

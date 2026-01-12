
import React, { useState, useEffect } from 'react';
import { Vehicle, DBChecklistItem, FuelType, LubricantType, User } from '../types';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  vehicles: Vehicle[];
  items: DBChecklistItem[];
  onRefresh: () => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ vehicles, items, onRefresh, onBack }) => {
  const [tab, setTab] = useState<'vehicles' | 'items' | 'fuels' | 'lubricants' | 'users'>('vehicles');
  const [loading, setLoading] = useState(false);
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (tab === 'users') fetchUsers();
  }, [tab]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('name');
    if (data) setDbUsers(data as User[]);
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
        <div className="p-10 bg-white rounded-[3rem] text-center border-4 border-dashed border-slate-100 text-slate-300 font-black uppercase tracking-widest">
           Use o formulário existente para gerenciar a Frota.
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

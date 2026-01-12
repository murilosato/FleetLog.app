
import React, { useState, useEffect } from 'react';
import { Vehicle, DBChecklistItem, User } from '../types';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  vehicles: Vehicle[];
  items: DBChecklistItem[];
  onRefresh: () => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ vehicles, items, onRefresh, onBack }) => {
  const [tab, setTab] = useState<'vehicles' | 'items' | 'users'>('vehicles');
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (tab === 'users') fetchUsers(); }, [tab]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('name');
    if (data) setDbUsers(data as User[]);
    setLoading(false);
  };

  const toggleActive = async (table: string, id: any, current: boolean) => {
    await supabase.from(table).update({ active: !current }).eq('id', id);
    if (table === 'users') fetchUsers(); else onRefresh();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-8">
        <h2 className="text-3xl font-black text-[#0A2540] uppercase">Gestão Master</h2>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] gap-1 overflow-x-auto hide-scrollbar">
          {['vehicles', 'items', 'users'].map(t => (
            <button key={t} onClick={() => setTab(t as any)} className={`px-8 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${tab === t ? 'bg-[#1E90FF] text-white shadow-xl' : 'text-slate-400'}`}>
              {t === 'vehicles' ? 'Frota' : t === 'items' ? 'Itens Checklist' : 'Usuários'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status Ativo</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tab === 'vehicles' && vehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-[#0A2540] text-lg">{v.prefix}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{v.plate} | {v.current_km} KM</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${v.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{v.active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive('vehicles', v.id, v.active)} className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">Alternar</button>
                  </td>
                </tr>
              ))}
              {tab === 'items' && items.map(i => (
                <tr key={i.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-[#0A2540] text-xs">[{i.id.toString().padStart(2, '0')}] {i.label}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{i.category}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${i.active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{i.active !== false ? 'Habilitado' : 'Desabilitado'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive('checklist_items', i.id, i.active !== false)} className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">Alternar</button>
                  </td>
                </tr>
              ))}
              {tab === 'users' && dbUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-[#0A2540] text-lg uppercase">{u.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{u.role} | MAT: {u.matricula}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${u.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{u.active ? 'Logado' : 'Bloqueado'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive('users', u.id, u.active)} className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">Alternar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

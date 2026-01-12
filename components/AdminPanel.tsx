
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

  const handleSave = async (table: string, data: any, id: any) => {
    setLoading(true);
    try {
      if (id) {
        await supabase.from(table).update(data).eq('id', id);
      } else {
        await supabase.from(table).insert([data]);
      }
      setEditingId(null);
      setEditData({});
      if (table === 'users') fetchUsers();
      else if (table === 'fuel_types' || table === 'lubricant_types') fetchInsumos();
      else onRefresh();
    } catch (err) { alert("Erro ao salvar dados."); } finally { setLoading(false); }
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2.5"/></svg></button>
          <h2 className="text-3xl font-black text-[#0A2540] uppercase">Gestão Master</h2>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] w-full lg:w-auto shadow-inner overflow-x-auto hide-scrollbar gap-1">
          {['vehicles', 'items', 'fuels', 'users'].map((t) => (
            <button key={t} onClick={() => { setTab(t as any); setEditingId(null); }} className={`flex-1 px-10 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-[#00548b] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              {t === 'vehicles' ? 'Frota' : t === 'items' ? 'Checklist' : t === 'fuels' ? 'Insumos' : 'Usuários'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="py-40 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest animate-pulse">Consultando Banco de Dados Administrativo...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Identificação / Nome</th>
                  <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Informações Adicionais</th>
                  <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b text-center">Status</th>
                  <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tab === 'vehicles' && vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-6"><p className="font-black text-[#0A2540] text-lg uppercase">{v.prefix}</p></td>
                    <td className="px-10 py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.plate} | {v.current_km} KM</p></td>
                    <td className="px-10 py-6 text-center"><span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase ${v.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{v.active ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="px-10 py-6 text-right"><button onClick={() => handleToggleStatus('vehicles', v.id, v.active)} className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all ${v.active ? 'bg-red-50 text-red-600' : 'bg-green-600 text-white'}`}>{v.active ? 'Inativar' : 'Reativar'}</button></td>
                  </tr>
                ))}
                {tab === 'items' && items.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-6"><p className="font-black text-[#0A2540] text-xs uppercase">[{i.id.toString().padStart(2, '0')}] {i.label}</p></td>
                    <td className="px-10 py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{i.category}</p></td>
                    <td className="px-10 py-6 text-center"><span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase ${i.active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{i.active !== false ? 'Habilitado' : 'Oculto'}</span></td>
                    <td className="px-10 py-6 text-right"><button onClick={() => handleToggleStatus('checklist_items', i.id, i.active !== false)} className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all ${i.active !== false ? 'bg-red-50 text-red-600' : 'bg-green-600 text-white'}`}>{i.active !== false ? 'Ocultar' : 'Exibir'}</button></td>
                  </tr>
                ))}
                {tab === 'fuels' && [...fuelTypes, ...lubricantTypes].map((ins: any) => (
                  <tr key={ins.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-6"><p className="font-black text-[#0A2540] text-sm uppercase">{ins.name}</p></td>
                    <td className="px-10 py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ins.name.includes('Diesel') ? 'Combustível' : 'Lubrificante'}</p></td>
                    <td className="px-10 py-6 text-center"><span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase ${ins.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{ins.active ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="px-10 py-6 text-right"><button onClick={() => handleToggleStatus(ins.name.includes('Diesel') ? 'fuel_types' : 'lubricant_types', ins.id, ins.active)} className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all ${ins.active ? 'bg-red-50 text-red-600' : 'bg-green-600 text-white'}`}>{ins.active ? 'Bloquear' : 'Desbloquear'}</button></td>
                  </tr>
                ))}
                {tab === 'users' && dbUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-6"><p className="font-black text-[#0A2540] text-sm uppercase">{u.name}</p></td>
                    <td className="px-10 py-6"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role} | MAT: {u.matricula}</p></td>
                    <td className="px-10 py-6 text-center"><span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase ${u.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{u.active ? 'Liberado' : 'Suspenso'}</span></td>
                    <td className="px-10 py-6 text-right"><button onClick={() => handleToggleStatus('users', u.id, u.active)} className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all ${u.active ? 'bg-red-50 text-red-600' : 'bg-green-600 text-white'}`}>{u.active ? 'Suspender' : 'Liberar'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

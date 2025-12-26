
import React, { useState } from 'react';
import { Vehicle, DBChecklistItem } from '../types';
import { supabase } from '../lib/supabase';
import { OFFICIAL_SOLURB_ITEMS } from '../constants';

interface AdminPanelProps {
  vehicles: Vehicle[];
  items: DBChecklistItem[];
  onRefresh: () => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ vehicles, items, onRefresh, onBack }) => {
  const [tab, setTab] = useState<'vehicles' | 'items'>('vehicles');
  const [loading, setLoading] = useState(false);

  const handleRestoreOfficialItems = async () => {
    if (!confirm("Isso irá remover os itens atuais e restaurar os 48 itens oficiais do formulário Solurb. Continuar?")) return;
    setLoading(true);
    try {
      // 1. Limpa atuais
      await supabase.from('checklist_items').delete().neq('id', 0);
      
      // 2. Insere oficiais
      const { error } = await supabase.from('checklist_items').insert(OFFICIAL_SOLURB_ITEMS);
      if (error) throw error;
      
      onRefresh();
      alert("Itens restaurados com sucesso!");
    } catch (err: any) {
      alert("Erro ao restaurar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resto das funções mantidas... (handleAddVehicle, handleToggle, etc)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white shadow-sm border rounded-2xl hover:bg-slate-50">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painel Administrativo</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
          <button onClick={() => setTab('vehicles')} className={`px-6 py-2 rounded-xl text-sm font-bold ${tab === 'vehicles' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Veículos</button>
          <button onClick={() => setTab('items')} className={`px-6 py-2 rounded-xl text-sm font-bold ${tab === 'items' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Itens Checklist</button>
        </div>
      </div>

      {tab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border shadow-sm">
            <h3 className="font-black text-slate-800 text-lg mb-6 uppercase">Configuração de Itens</h3>
            <button 
              onClick={handleRestoreOfficialItems}
              disabled={loading}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all mb-4"
            >
              RESTAURAR 48 ITENS OFICIAIS
            </button>
            <p className="text-[10px] text-slate-400 font-bold uppercase text-center leading-tight">
              Use este botão para garantir que o aplicativo siga a ordem exata do formulário físico da Solurb.
            </p>
          </div>
          <div className="lg:col-span-2 space-y-6">
             {/* Listagem de itens mantida... */}
             {items.sort((a,b) => a.id - b.id).map(item => (
                <div key={item.id} className="p-4 bg-white border rounded-xl flex justify-between">
                   <span className="font-bold text-slate-700">{item.label}</span>
                   <span className="text-[9px] text-slate-400 font-black uppercase">{item.category}</span>
                </div>
             ))}
          </div>
        </div>
      )}
      {/* Resto do JSX de Veículos mantido... */}
    </div>
  );
};

export default AdminPanel;

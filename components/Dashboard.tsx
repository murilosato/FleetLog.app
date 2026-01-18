
import React from 'react';
import { ChecklistEntry, User, DBChecklistItem, RefuelingEntry, LubricantEntry, MaintenanceSession } from '../types';

interface DashboardProps {
  submissions: ChecklistEntry[];
  refuelings: RefuelingEntry[];
  lubricants: LubricantEntry[];
  maintenances: MaintenanceSession[];
  user: User;
  availableItems: DBChecklistItem[];
  onNewChecklist: () => void;
  onNewRefueling: () => void;
  onNewLubricant: () => void;
  onNewOS: () => void;
  onMaintenanceTimer: () => void;
  onViewHistory: () => void;
  onRefresh: () => void;
  aiSummary: string | null;
  isSummarizing: boolean;
  generateAiReport: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, onNewChecklist, onNewRefueling, onNewLubricant, onNewOS, onMaintenanceTimer, onViewHistory
}) => {
  // Lógica de Permissões por Cargo
  const canChecklist = ['ADMIN', 'OPERADOR', 'OPERACAO'].includes(user.role);
  const canRefuel = ['ADMIN', 'OPERADOR'].includes(user.role);
  const canLubricate = ['ADMIN', 'OPERADOR'].includes(user.role);
  const canMaintenance = ['ADMIN', 'MANUTENCAO'].includes(user.role);
  const canOS = ['ADMIN', 'MANUTENCAO', 'OPERACAO'].includes(user.role);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black text-[#0A2540] tracking-tight">CENTRAL <span className="text-[#00548b]">OPERACIONAL</span></h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">Olá, {user.name} | Cargo: {user.role}</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xs shadow-sm">FL</div>
           <div className="h-10 w-px bg-slate-100 hidden md:block"></div>
           <button onClick={onViewHistory} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#0A2540] transition-colors">Consultar Registros</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CHECKLIST - Vistoria */}
        {canChecklist && (
          <button onClick={onNewChecklist} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-[#00548b] transition-all group flex flex-col items-center text-center space-y-6 active:scale-95">
            <div className="w-20 h-20 bg-[#00548b] text-white rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </div>
            <div>
                <h3 className="text-xl font-black text-[#0A2540] uppercase">Vistoria</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Checklist de Saída/Retorno</p>
            </div>
          </button>
        )}

        {/* ABASTECIMENTO */}
        {canRefuel && (
          <button onClick={onNewRefueling} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-[#58CC02] transition-all group flex flex-col items-center text-center space-y-6 active:scale-95">
            <div className="w-20 h-20 bg-[#58CC02] text-white rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
                <h3 className="text-xl font-black text-[#0A2540] uppercase">Abastecer</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Combustível e ARLA 32</p>
            </div>
          </button>
        )}

        {/* LUBRIFICANTE */}
        {canLubricate && (
          <button onClick={onNewLubricant} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-[#FFA500] transition-all group flex flex-col items-center text-center space-y-6 active:scale-95">
            <div className="w-20 h-20 bg-[#FFA500] text-white rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            </div>
            <div>
                <h3 className="text-xl font-black text-[#0A2540] uppercase">Lubrif.</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Insumos e Fluidos</p>
            </div>
          </button>
        )}

        {/* OFICINA */}
        {canMaintenance && (
          <button onClick={onMaintenanceTimer} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-slate-800 transition-all group flex flex-col items-center text-center space-y-6 active:scale-95">
            <div className="w-20 h-20 bg-slate-800 text-white rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
                <h3 className="text-xl font-black text-[#0A2540] uppercase">Oficina</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cronômetro de Manutenção</p>
            </div>
          </button>
        )}

        {/* O.S. FROTA */}
        {canOS && (
          <button onClick={onNewOS} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-red-600 transition-all group flex flex-col items-center text-center space-y-6 active:scale-95">
            <div className="w-20 h-20 bg-red-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div>
                <h3 className="text-xl font-black text-[#0A2540] uppercase">O.S. Frota</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Abertura de Ocorrência</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

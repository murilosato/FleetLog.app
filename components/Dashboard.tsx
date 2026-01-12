
import React, { useState, useMemo } from 'react';
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
  submissions, refuelings, lubricants, maintenances, user,
  onNewChecklist, onNewRefueling, onNewLubricant, onNewOS, onMaintenanceTimer, onViewHistory
}) => {
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);

  const inProgressMaint = useMemo(() => maintenances.filter(m => m.status !== 'FINISHED'), [maintenances]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-[#0A2540]">Olá, <span className="text-[#00548b]">{user.name.split(' ')[0]}</span></h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Frota | {dashboardDate}</p>
        </div>
        <div className="flex gap-2">
           <button onClick={onNewChecklist} className="px-4 py-2.5 bg-[#0A2540] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">Novo Checklist</button>
           <button onClick={onNewOS} className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">Abrir O.S.</button>
        </div>
      </div>

      {inProgressMaint.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[2rem] space-y-4">
           <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              Manutenções em Aberto ({inProgressMaint.length})
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressMaint.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex justify-between items-center">
                   <div>
                      <p className="text-lg font-black text-[#0A2540]">{m.prefix}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{m.status === 'ACTIVE' ? 'Trabalhando' : 'Pausado'}</p>
                   </div>
                   <button onClick={onMaintenanceTimer} className="text-[8px] font-black bg-orange-500 text-white px-3 py-1.5 rounded-lg uppercase">Gerenciar</button>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Atividades de Hoje</h3>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
               {submissions.length === 0 && refuelings.length === 0 && lubricants.length === 0 && (
                 <div className="py-20 text-center opacity-30 font-black uppercase text-[10px]">Nenhuma atividade registrada hoje</div>
               )}
               <div className="divide-y divide-slate-50">
                  {submissions.map(s => (
                    <div key={s.id} className="p-5 flex justify-between items-center hover:bg-slate-50/50">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-[10px]">VIS</div>
                          <div>
                             <p className="text-sm font-black text-[#0A2540]">{s.prefix}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">Checklist {s.type} - {s.shift}</p>
                          </div>
                       </div>
                       <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${s.has_issues ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{s.has_issues ? 'Com Falha' : 'OK'}</span>
                    </div>
                  ))}
                  {refuelings.map(r => (
                    <div key={r.id} className="p-5 flex justify-between items-center hover:bg-slate-50/50">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-black text-[10px]">ABS</div>
                          <div>
                             <p className="text-sm font-black text-[#0A2540]">{r.prefix}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">Abastecimento: {r.quantity}L</p>
                          </div>
                       </div>
                       <p className="text-[10px] font-tech font-bold text-slate-400">{r.km} KM</p>
                    </div>
                  ))}
                  {lubricants.map(l => (
                    <div key={l.id} className="p-5 flex justify-between items-center hover:bg-slate-50/50">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-black text-[10px]">LUB</div>
                          <div>
                             <p className="text-sm font-black text-[#0A2540]">{l.prefix}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">Lubrificação: {l.quantity}</p>
                          </div>
                       </div>
                       <p className="text-[10px] font-tech font-bold text-slate-400">{l.km} KM</p>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Métricas Rápidas</h3>
            <div className="bg-[#0A2540] p-8 rounded-[2.5rem] text-white space-y-8 shadow-xl">
               <div className="flex justify-between items-end border-b border-white/10 pb-6">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Vistorias</p>
                    <p className="text-3xl font-black">{submissions.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Combustível</p>
                    <p className="text-3xl font-black">{refuelings.reduce((acc, r) => acc + r.quantity, 0).toFixed(0)}<span className="text-xs ml-1">L</span></p>
                  </div>
               </div>
               <button onClick={onViewHistory} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all">Relatórios Completos</button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;

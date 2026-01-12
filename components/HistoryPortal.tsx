
import React from 'react';

interface HistoryPortalProps {
  onSelectChecklists: () => void;
  onSelectRefueling: () => void;
  onSelectLubricant: () => void;
  onSelectMaintenance: () => void;
  onSelectServiceOrder: () => void;
  onBack: () => void;
}

const HistoryPortal: React.FC<HistoryPortalProps> = ({ 
  onSelectChecklists, 
  onSelectRefueling, 
  onSelectLubricant, 
  onSelectMaintenance, 
  onSelectServiceOrder,
  onBack 
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center gap-6 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <button onClick={onBack} className="p-4 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
          <svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <h2 className="text-3xl font-black text-[#0A2540] tracking-tight uppercase">Históricos Operacionais</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* CHECKLIST */}
        <div onClick={onSelectChecklists} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-[#0A2540] transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#0A2540] rounded-3xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <h3 className="text-xs font-black text-[#0A2540] uppercase">Checklist</h3>
        </div>

        {/* ABASTECIMENTO */}
        <div onClick={onSelectRefueling} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-[#58CC02] transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#58CC02] rounded-3xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h3 className="text-xs font-black text-[#0A2540] uppercase">Abastecer</h3>
        </div>

        {/* LUBRIFICANTE */}
        <div onClick={onSelectLubricant} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-[#FFA500] transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#FFA500] rounded-3xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
          </div>
          <h3 className="text-xs font-black text-[#0A2540] uppercase">Lubrif.</h3>
        </div>

        {/* O.S. */}
        <div onClick={onSelectServiceOrder} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-red-600 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h3 className="text-xs font-black text-[#0A2540] uppercase">O.S. Frota</h3>
        </div>

        {/* OFICINA */}
        <div onClick={onSelectMaintenance} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-slate-800 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3 className="text-xs font-black text-[#0A2540] uppercase">Oficina</h3>
        </div>
      </div>
    </div>
  );
};

export default HistoryPortal;

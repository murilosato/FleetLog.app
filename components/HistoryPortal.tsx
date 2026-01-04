
import React from 'react';

interface HistoryPortalProps {
  onSelectChecklists: () => void;
  onSelectRecords: () => void;
  onBack: () => void;
}

const HistoryPortal: React.FC<HistoryPortalProps> = ({ onSelectChecklists, onSelectRecords, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center gap-6 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <button onClick={onBack} className="p-4 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
          <svg className="w-6 h-6 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <h2 className="text-3xl font-black text-[#0A2540] tracking-tight">Escolha o Histórico</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div 
          onClick={onSelectChecklists}
          className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 hover:border-[#1E90FF] transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="w-20 h-20 bg-[#1E90FF]/10 rounded-3xl flex items-center justify-center text-[#1E90FF] mb-8 group-hover:scale-110 transition-transform">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <h3 className="text-2xl font-black text-[#0A2540] uppercase tracking-tight">Checklists</h3>
          <p className="text-slate-400 font-bold mt-2 leading-relaxed">Vistorias de saída e retorno da frota.</p>
        </div>

        <div 
          onClick={onSelectRecords}
          className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 hover:border-[#58CC02] transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="w-20 h-20 bg-[#58CC02]/10 rounded-3xl flex items-center justify-center text-[#58CC02] mb-8 group-hover:scale-110 transition-transform">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h3 className="text-2xl font-black text-[#0A2540] uppercase tracking-tight">Insumos</h3>
          <p className="text-slate-400 font-bold mt-2 leading-relaxed">Abastecimentos e lubrificantes.</p>
        </div>

        <div 
          onClick={onSelectRecords} // Redireciona para registros de insumos mas o RecordsHistoryView terá nova aba
          className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 hover:border-red-600 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="w-20 h-20 bg-red-600/10 rounded-3xl flex items-center justify-center text-red-600 mb-8 group-hover:scale-110 transition-transform">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3 className="text-2xl font-black text-[#0A2540] uppercase tracking-tight">Oficina</h3>
          <p className="text-slate-400 font-bold mt-2 leading-relaxed">Tempos de manutenção efetiva.</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryPortal;


import React from 'react';
import { ChecklistEntry } from '../types';

interface DashboardProps {
  submissions: ChecklistEntry[];
  onNewChecklist: () => void;
  onViewHistory: () => void;
  aiSummary: string | null;
  isSummarizing: boolean;
  generateAiReport: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  submissions, 
  onNewChecklist, 
  onViewHistory,
  aiSummary,
  isSummarizing,
  generateAiReport
}) => {
  const lastSubmission = submissions[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Action Card */}
        <div 
          onClick={onNewChecklist}
          className="bg-emerald-600 p-6 rounded-2xl text-white shadow-lg cursor-pointer hover:bg-emerald-700 transition-all flex items-center justify-between group"
        >
          <div>
            <h2 className="text-xl font-bold">Nova Inspeção</h2>
            <p className="opacity-80">Iniciar checklist de saída/retorno</p>
          </div>
          <div className="bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-slate-500 font-medium">Inspeções Realizadas</h2>
            <p className="text-3xl font-bold text-slate-800">{submissions.length}</p>
          </div>
          <button 
            onClick={onViewHistory}
            className="text-emerald-600 font-semibold hover:underline"
          >
            Ver Histórico
          </button>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            <h3 className="font-bold text-slate-700">Resumo da Frota (IA)</h3>
          </div>
          <button 
            disabled={isSummarizing || submissions.length === 0}
            onClick={generateAiReport}
            className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold hover:bg-purple-200 disabled:opacity-50 transition-colors"
          >
            {isSummarizing ? 'Analisando...' : 'Atualizar Análise'}
          </button>
        </div>
        <div className="p-6">
          {aiSummary ? (
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 italic">
              {submissions.length === 0 
                ? "Faça inspeções para gerar relatórios inteligentes." 
                : "Clique em 'Atualizar Análise' para que a IA avalie os dados da frota."}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-3">Atividades Recentes</h3>
        {lastSubmission ? (
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold">
                {lastSubmission.prefix}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">Checklist de {lastSubmission.type} Finalizado</p>
                <p className="text-sm text-slate-500">{lastSubmission.date} • {lastSubmission.driver_name}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${lastSubmission.shift === 'Diurno' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {lastSubmission.shift}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
            Nenhuma inspeção registrada ainda.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

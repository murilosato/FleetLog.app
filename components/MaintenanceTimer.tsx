
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Vehicle, MaintenanceSession, MaintenancePause } from '../types';
import { supabase } from '../lib/supabase';

interface MaintenanceTimerProps {
  user: User;
  vehicles: Vehicle[];
  initialSessionId?: string | null;
  onBack: () => void;
}

const MaintenanceTimer: React.FC<MaintenanceTimerProps> = ({ user, vehicles, initialSessionId, onBack }) => {
  const [activeSessions, setActiveSessions] = useState<MaintenanceSession[]>([]);
  const [currentSession, setCurrentSession] = useState<MaintenanceSession | null>(null);
  const [pauses, setPauses] = useState<MaintenancePause[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  
  // Form states
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [openingReason, setOpeningReason] = useState('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('Intervalo');
  const [isStartingNew, setIsStartingNew] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchActiveSessions();
  }, [initialSessionId]);

  const fetchActiveSessions = async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('maintenance_sessions')
        .select('*')
        .in('status', ['ACTIVE', 'PAUSED']);
      
      if (user.role !== 'ADMIN') {
        query.eq('user_id', user.id);
      }

      const { data } = await query;
      const sessions = (data || []) as MaintenanceSession[];
      setActiveSessions(sessions);

      if (initialSessionId) {
        const found = sessions.find(s => s.id === initialSessionId);
        if (found) {
          handleSelectSession(found);
        } else {
          const { data: specific } = await supabase
            .from('maintenance_sessions')
            .select('*')
            .eq('id', initialSessionId)
            .single();
          if (specific) handleSelectSession(specific as MaintenanceSession);
        }
      } else if (sessions.length === 0) {
        setIsStartingNew(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = async (session: MaintenanceSession) => {
    setCurrentSession(session);
    setLoading(true);
    try {
      const { data: pauseList } = await supabase
        .from('maintenance_pauses')
        .select('*')
        .eq('session_id', session.id);
      setPauses(pauseList || []);
      setIsStartingNew(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateEffectiveSeconds = (session: MaintenanceSession, sessionPauses: MaintenancePause[], referenceTime: number) => {
    const startTs = new Date(session.start_time).getTime();
    
    let totalPauseMs = 0;
    sessionPauses.forEach(p => {
      const pStart = new Date(p.pause_start).getTime();
      const pEnd = p.pause_end ? new Date(p.pause_end).getTime() : referenceTime;
      totalPauseMs += (pEnd - pStart);
    });

    const effective = referenceTime - startTs - totalPauseMs;
    return Math.floor(Math.max(0, effective / 1000));
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!selectedVehicleId || !openingReason) {
      alert("Informe o veículo e o motivo da manutenção.");
      return;
    }

    setIsSaving(true);
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    try {
      const { data, error } = await supabase
        .from('maintenance_sessions')
        .insert([{
          user_id: user.id,
          vehicle_id: selectedVehicleId,
          prefix: vehicle?.prefix,
          opening_reason: openingReason,
          status: 'ACTIVE'
        }])
        .select()
        .single();

      if (error) throw error;
      const newSession = data as MaintenanceSession;
      await handleSelectSession(newSession);
      fetchActiveSessions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePause = async () => {
    if (!currentSession) return;
    setIsSaving(true);
    try {
      const { error: pError } = await supabase.from('maintenance_pauses').insert([{ session_id: currentSession.id, reason: pauseReason }]);
      if (pError) throw pError;
      
      const { error: sError } = await supabase.from('maintenance_sessions').update({ status: 'PAUSED' }).eq('id', currentSession.id);
      if (sError) throw sError;

      setShowPauseModal(false);
      await fetchActiveSessions();
      const updated = { ...currentSession, status: 'PAUSED' as const };
      handleSelectSession(updated);
    } catch (err: any) {
      alert("Erro ao pausar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResume = async () => {
    if (!currentSession) return;
    setIsSaving(true);
    try {
      const openPause = pauses.find(p => !p.pause_end);
      if (openPause) {
        await supabase.from('maintenance_pauses').update({ pause_end: new Date().toISOString() }).eq('id', openPause.id);
      }
      await supabase.from('maintenance_sessions').update({ status: 'ACTIVE' }).eq('id', currentSession.id);
      await fetchActiveSessions();
      const updated = { ...currentSession, status: 'ACTIVE' as const };
      handleSelectSession(updated);
    } catch (err: any) {
      alert("Erro ao retomar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!currentSession) return;
    if (!confirm("Deseja finalizar este apontamento e gravar o tempo efetivo no histórico?")) return;

    setIsSaving(true);
    const finalNow = new Date().toISOString();
    const finalNowTs = new Date(finalNow).getTime();

    try {
      if (currentSession.status === 'PAUSED') {
        const openPause = pauses.find(p => !p.pause_end);
        if (openPause) {
          const { error: pauseUpdateError } = await supabase
            .from('maintenance_pauses')
            .update({ pause_end: finalNow })
            .eq('id', openPause.id);
          if (pauseUpdateError) throw pauseUpdateError;
          const updatedPauses = pauses.map(p => p.id === openPause.id ? { ...p, pause_end: finalNow } : p);
          setPauses(updatedPauses);
        }
      }

      const latestPauses = pauses.map(p => !p.pause_end && currentSession.status === 'PAUSED' ? { ...p, pause_end: finalNow } : p);
      const effectiveSecs = calculateEffectiveSeconds(currentSession, latestPauses, finalNowTs);

      const { error: sessionError } = await supabase
        .from('maintenance_sessions')
        .update({ 
          status: 'FINISHED', 
          end_time: finalNow,
          total_effective_seconds: effectiveSecs
        })
        .eq('id', currentSession.id);

      if (sessionError) throw sessionError;

      alert(`Sucesso! Manutenção gravada.\nTempo Efetivo: ${formatDuration(effectiveSecs)}`);
      
      setCurrentSession(null);
      setPauses([]);
      fetchActiveSessions();
    } catch (err: any) {
      alert("Falha ao finalizar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Gestão da Oficina */}
      <div className="flex items-center justify-between bg-white p-6 sm:p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all shadow-sm">
            <svg className="w-5 h-5 text-[#0A2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A2540] tracking-tight uppercase">Gestão da Oficina</h2>
        </div>
        {currentSession || isStartingNew ? (
          <button onClick={() => { setCurrentSession(null); setIsStartingNew(false); fetchActiveSessions(); }} className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-transparent hover:border-slate-300 transition-all">Painel Geral</button>
        ) : (
          <button onClick={() => setIsStartingNew(true)} className="px-6 py-3.5 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 flex items-center gap-2 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            Novo Cronômetro
          </button>
        )}
      </div>

      {!currentSession && !isStartingNew ? (
        <div className="space-y-6">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Manutenções Ativas ({activeSessions.length})</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {activeSessions.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => handleSelectSession(s)}
                  className={`bg-white p-8 rounded-[2.5rem] sm:rounded-[3rem] border-4 transition-all cursor-pointer hover:shadow-xl active:scale-[0.98] ${s.status === 'PAUSED' ? 'border-orange-100 shadow-orange-50' : 'border-[#0A2540] shadow-blue-50'}`}
                >
                   <div className="flex justify-between items-start mb-4">
                      <span className="text-3xl font-black text-[#0A2540]">{s.prefix}</span>
                      <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${s.status === 'PAUSED' ? 'bg-orange-500 text-white' : 'bg-[#58CC02] text-white animate-pulse'}`}>
                        {s.status === 'ACTIVE' ? 'Em curso' : 'Pausado'}
                      </span>
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-6 truncate">{s.opening_reason}</p>
                   <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-50">
                      <div className={`w-2 h-2 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      <span className="text-[11px] font-black text-slate-700 uppercase">Gerenciar Apontamento</span>
                   </div>
                </div>
              ))}
              {activeSessions.length === 0 && (
                <div className="col-span-full h-48 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-center p-6">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma ordem de serviço ativa</p>
                  <button onClick={() => setIsStartingNew(true)} className="mt-3 text-[10px] font-black text-[#1E90FF] underline uppercase">Abrir Nova Agora</button>
                </div>
              )}
           </div>
        </div>
      ) : isStartingNew ? (
        <div className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 animate-in zoom-in-95 duration-300">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Ordem de Manutenção</h3>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">Veículo</label>
                    <select 
                      value={selectedVehicleId} 
                      onChange={e => setSelectedVehicleId(e.target.value)}
                      className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-black text-slate-950 outline-none focus:bg-white focus:border-red-500 transition-all text-sm"
                    >
                      <option value="">Selecione o prefixo...</option>
                      {vehicles.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">Motivo da Abertura</label>
                    <textarea 
                      value={openingReason} 
                      onChange={e => setOpeningReason(e.target.value)}
                      placeholder="Relate o problema..."
                      className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] font-bold text-slate-950 outline-none focus:bg-white focus:border-red-500 transition-all text-sm h-32"
                    />
                 </div>
                 <button 
                  onClick={handleStart}
                  disabled={isSaving}
                  className="w-full py-5 bg-red-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-4"
                 >
                   {isSaving ? 'Iniciando...' : 'Iniciar Cronômetro'}
                 </button>
              </div>
           </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
           <div className="bg-[#0A2540] p-10 rounded-[3.5rem] shadow-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600/30"></div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">Tempo Efetivo - {currentSession.prefix}</p>
              <h1 className="text-6xl sm:text-8xl font-tech font-black text-white tracking-tighter mb-4">
                {formatDuration(calculateEffectiveSeconds(currentSession, pauses, now))}
              </h1>
              <div className="flex items-center justify-center gap-4">
                 <span className={`w-3 h-3 rounded-full ${currentSession.status === 'ACTIVE' ? 'bg-[#58CC02] shadow-[0_0_15px_#58CC02] animate-pulse' : 'bg-orange-500 shadow-[0_0_15px_#f97316]'}`}></span>
                 <p className="text-[11px] font-black text-white uppercase tracking-widest">{currentSession.status === 'ACTIVE' ? 'Mecânico trabalhando' : 'Trabalho Pausado'}</p>
              </div>
           </div>

           <div className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-50 pb-6">
                 <div>
                    <h3 className="text-2xl font-black text-[#0A2540] uppercase">{currentSession.prefix}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abertura: {new Date(currentSession.start_time).toLocaleString('pt-BR')}</p>
                 </div>
                 <div className="bg-red-50 px-4 py-2 rounded-2xl text-right">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Responsável</span>
                    <p className="text-[11px] font-black text-slate-700 uppercase truncate max-w-[150px]">{currentSession.user_name || user.name}</p>
                 </div>
              </div>
              
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Descrição:</p>
                 <p className="text-sm sm:text-base font-bold text-slate-700 leading-relaxed italic">"{currentSession.opening_reason}"</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                 {currentSession.status === 'ACTIVE' ? (
                   <button 
                    onClick={() => setShowPauseModal(true)}
                    disabled={isSaving}
                    className="py-5 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                     Pausar Trabalho
                   </button>
                 ) : (
                   <button 
                    onClick={handleResume}
                    disabled={isSaving}
                    className="py-5 bg-[#58CC02] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                     Retomar Trabalho
                   </button>
                 )}
                 <button 
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="py-5 bg-[#0A2540] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                   Finalizar e Gravar
                 </button>
              </div>
           </div>

           {pauses.length > 0 && (
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Histórico de Pausas</h4>
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 space-y-4">
                   {pauses.map((p) => (
                     <div key={p.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                        <div className="flex flex-col">
                           <span className="text-[11px] font-black text-[#0A2540] uppercase">{p.reason}</span>
                           <span className="text-[9px] font-bold text-slate-400">Início: {new Date(p.pause_start).toLocaleTimeString()} {p.pause_end ? `- Fim: ${new Date(p.pause_end).toLocaleTimeString()}` : ''}</span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${p.pause_end ? 'text-slate-300' : 'text-orange-500 animate-pulse'}`}>
                          {p.pause_end ? 'Encerrada' : 'Pausa Ativa'}
                        </span>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      )}

      {showPauseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0A2540]/60 backdrop-blur-md">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full space-y-8 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                 <h3 className="text-xl font-black text-[#0A2540] uppercase tracking-tight">Motivo da Pausa</h3>
                 <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">O tempo efetivo será pausado</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {['Aguardando peça', 'Intervalo', 'Troca de Técnico', 'Outro'].map(r => (
                   <button 
                    key={r}
                    onClick={() => setPauseReason(r)}
                    className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${pauseReason === r ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}
                   >
                     {r}
                   </button>
                 ))}
              </div>
              <div className="flex gap-3 pt-4">
                 <button onClick={() => setShowPauseModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
                 <button onClick={handlePause} className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-100">Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceTimer;

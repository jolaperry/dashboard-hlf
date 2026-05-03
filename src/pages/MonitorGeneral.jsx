import React, { useState, useEffect } from 'react';
import { Activity, PhoneCall, UserCheck, Coffee, PowerOff, Clock, MessageSquare, ShieldCheck, Bath, GraduationCap, Utensils, FileText } from 'lucide-react';

const MonitorGeneral = () => {
  const [data, setData] = useState([[], [], [], []]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const fetchMonitorData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/monitor`);
        const result = await response.json();
        if (Array.isArray(result) && result.length >= 4) {
          setData(result);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("Error al obtener datos:", error);
      }
    };

    fetchMonitorData();
    const interval = setInterval(fetchMonitorData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds) => {
    if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds)) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Función para elegir el ícono según el estado específico (para la columna Otros)
  const getStatusIcon = (estado) => {
    const e = estado?.toLowerCase() || '';
    if (e.includes('baño')) return Bath;
    if (e.includes('break')) return Coffee;
    if (e.includes('capacitaci')) return GraduationCap;
    if (e.includes('colaci')) return Utensils;
    if (e.includes('admin')) return FileText;
    return ShieldCheck;
  };

  const columnsConfig = [
    {
      title: "En Llamadas",
      icon: PhoneCall,
      borderColor: "border-emerald-500",
      glowColor: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      headerColor: "text-emerald-400",
      cardBg: "bg-emerald-950/40",
      cardBorder: "border-emerald-800/50",
      cardText: "text-emerald-100"
    },
    {
      title: "Usuarios En Línea",
      icon: UserCheck,
      borderColor: "border-cyan-500",
      glowColor: "shadow-[0_0_15px_rgba(6,182,212,0.2)]",
      headerColor: "text-cyan-400",
      cardBg: "bg-cyan-950/40",
      cardBorder: "border-cyan-800/50",
      cardText: "text-cyan-100"
    },
    {
      title: "Desconectados", // SEGÚN TUS DATOS, EL ÍNDICE 2 ES CIERRE SESIÓN
      icon: PowerOff,
      borderColor: "border-slate-600",
      glowColor: "shadow-none",
      headerColor: "text-slate-400",
      cardBg: "bg-slate-800/30",
      cardBorder: "border-slate-700/50",
      cardText: "text-slate-400"
    },
    {
      title: "Otros Estados", // SEGÚN TUS DATOS, EL ÍNDICE 3 SON LOS AUXILIARES
      icon: Coffee,
      borderColor: "border-purple-500",
      glowColor: "shadow-[0_0_15px_rgba(168,85,247,0.2)]",
      headerColor: "text-purple-400",
      cardBg: "bg-purple-950/40",
      cardBorder: "border-purple-800/50",
      cardText: "text-purple-100"
    }
  ];

  // Reordenamos el mapeo para que visualmente se vea: Llamada | En Línea | Otros | Desconectados
  // Pero usando los índices correctos que descubrimos: [0] | [1] | [3] | [2]
  const visualOrder = [0, 1, 3, 2];

  return (
    <div className="p-4 min-h-screen font-sans bg-[#0f172a]">
      {/* HEADER MONITOR */}
      <div className="mb-6 flex items-center justify-between bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">Monitor en Vivo</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest">HLF MONITORING SYSTEM</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Sync Status</p>
          <p className="text-sm font-mono text-blue-400">{lastUpdate.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {visualOrder.map((dataIndex) => {
          const col = columnsConfig[dataIndex];
          const columnData = data[dataIndex] || [];
          const HeaderIcon = col.icon;
          
          return (
            <div 
              key={dataIndex} 
              className={`flex flex-col bg-slate-900/50 rounded-xl border-t-2 ${col.borderColor} ${col.glowColor} border-l border-r border-b border-slate-800 min-h-[75vh] transition-all duration-500`}
            >
              {/* Header Columna */}
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <HeaderIcon className={`w-4 h-4 ${col.headerColor}`} />
                  <h2 className={`font-bold text-xs uppercase tracking-widest ${col.headerColor}`}>
                    {col.title}
                  </h2>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 ${col.headerColor} border border-slate-700`}>
                  {columnData.length}
                </span>
              </div>

              {/* Lista de Agentes */}
              <div className="p-3 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-250px)] scroller">
                {columnData.map((agente, idx) => {
                  const StatusIcon = dataIndex === 3 ? getStatusIcon(agente.estado) : col.icon;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${col.cardBg} ${col.cardBorder} flex flex-col gap-2 transition-all hover:scale-[1.02] active:scale-100 shadow-sm`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${col.headerColor}`} />
                          <span className={`font-bold text-sm truncate ${col.cardText}`}>
                            {agente.agente}
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border border-current opacity-60 ${col.headerColor}`}>
                          {agente.anexo}
                        </span>
                      </div>

                      <div className="flex justify-between items-end mt-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3 h-3 text-slate-400`} />
                          <span className={`text-xs font-mono font-bold ${col.cardText}`}>
                            {formatTime(agente.tiempo)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="flex items-center gap-1 mb-0.5">
                              <MessageSquare className="w-2.5 h-2.5 opacity-40 text-white" />
                              <span className="text-[9px] font-bold text-white/50">{agente.llama_total}</span>
                           </div>
                           <span className={`text-[9px] font-black uppercase tracking-tighter ${col.headerColor}`}>
                            {agente.estado}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 mt-1 border-t border-white/5 flex items-center gap-1.5 overflow-hidden">
                        <Activity className={`w-2.5 h-2.5 opacity-30 text-white`} />
                        <span className={`text-[9px] truncate opacity-40 text-white font-medium uppercase tracking-tight`}>
                          {agente.page}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {columnData.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 opacity-10 grayscale">
                    <HeaderIcon className="w-12 h-12 mb-2 text-white" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Vacío</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonitorGeneral;
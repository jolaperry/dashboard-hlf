// src/components/LeaderboardGrid.jsx
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { secToTime } from '../utils/helpers';
import { ArrowDownAZ, ArrowUpZA } from 'lucide-react';

export default function LeaderboardGrid() {
  const filteredData = useAppStore((state) => state.filteredData);

  const agentMap = {};
  filteredData.forEach(d => {
    if (!agentMap[d.agente]) {
      agentMap[d.agente] = { 
        agente: d.agente, 
        t_hablado: 0, 
        t_acw: 0, 
        t_en_linea: 0, 
        t_con: 0, 
        calls: 0, 
        noCalls: 0, 
        cortas: 0,
        dias: new Set()
      };
    }
    agentMap[d.agente].t_hablado += (d.t_hablado_tel || 0);
    agentMap[d.agente].t_acw += (d.t_acw || 0);
    agentMap[d.agente].t_en_linea += (d.t_en_linea || 0);
    agentMap[d.agente].t_con += (d.t_conectado_real || 0);
    agentMap[d.agente].calls += (d.c_calls || 0);
    agentMap[d.agente].noCalls += (d.c_no_atendidas || 0);
    agentMap[d.agente].cortas += (d.c_cortas || 0);
    agentMap[d.agente].dias.add(d.fecha);
  });

  const agents = Object.values(agentMap).map(a => {
    const totalInt = a.calls + a.noCalls;
    return {
      agente: a.agente,
      prod: a.t_con > 0 ? (a.t_hablado / a.t_con) * 100 : 0,
      adh: a.t_con > 0 ? (a.t_con / (a.dias.size * 32400)) * 100 : 0,
      ocup: a.t_con > 0 ? ((a.t_hablado + a.t_acw + a.t_en_linea) / a.t_con) * 100 : 0,
      tmo: a.calls > 0 ? a.t_hablado / a.calls : 0,
      pacw: a.calls > 0 ? a.t_acw / a.calls : 0,
      plinea: a.calls > 0 ? a.t_en_linea / a.calls : 0,
      cortas: a.cortas,
      contact: totalInt > 0 ? (a.calls / totalInt) * 100 : 0
    };
  });

  const [sorts, setSorts] = useState({
    prod: 'desc', adh: 'desc', ocup: 'desc', tmo: 'asc', pacw: 'asc', cortas: 'desc', plinea: 'asc', contact: 'desc'
  });

  const toggleSort = (key) => {
    setSorts(prev => ({ ...prev, [key]: prev[key] === 'asc' ? 'desc' : 'asc' }));
  };

  const pct = (val) => `${val.toFixed(0)}%`;
  const pctDec = (val) => `${val.toFixed(1)}%`;
  const num = (val) => val;

  const getInitials = (name) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
    return 'AG';
  };

  const getShortName = (name) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
    return parts[0];
  };

  const renderColumn = (key, title, formatFunc, themeClass) => {
    const sortType = sorts[key];
    const sorted = [...agents].sort((a, b) => sortType === 'asc' ? a[key] - b[key] : b[key] - a[key]);

    // Extraer colores dinámicos
    const isBlue = themeClass.includes('blue');
    const isTeal = themeClass.includes('teal');
    const isOrange = themeClass.includes('orange');
    const isIndigo = themeClass.includes('indigo');
    
    let bgLight = 'bg-slate-50';
    let textDark = 'text-slate-700';
    
    if (isBlue) { bgLight = 'bg-blue-50/50'; textDark = 'text-blue-700'; }
    if (isTeal) { bgLight = 'bg-teal-50/50'; textDark = 'text-teal-700'; }
    if (isOrange) { bgLight = 'bg-orange-50/50'; textDark = 'text-orange-700'; }
    if (isIndigo) { bgLight = 'bg-indigo-50/50'; textDark = 'text-indigo-700'; }

    return (
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col h-[380px] overflow-hidden group">
        <div 
          onClick={() => toggleSort(key)}
          className={`px-4 py-3 border-b border-slate-100 flex justify-between items-center cursor-pointer transition-colors ${bgLight} hover:opacity-80`}
        >
          <span className={`text-[10px] font-bold ${textDark} uppercase tracking-wider`}>{title}</span>
          <div className={`p-1 rounded bg-white shadow-sm border border-slate-100 ${textDark}`}>
            {sortType === 'asc' ? <ArrowDownAZ size={14} strokeWidth={2.5} /> : <ArrowUpZA size={14} strokeWidth={2.5} />}
          </div>
        </div>

        <div className="overflow-y-auto scroller flex-1 p-2 space-y-1">
          {sorted.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group/row">
              <div className="flex items-center gap-2 overflow-hidden w-[65%]">
                <span className="text-[10px] font-bold text-slate-400 w-4 text-right shrink-0">
                  {idx + 1}
                </span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${bgLight} ${textDark} border border-white shadow-sm`}>
                  {getInitials(item.agente)}
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate" title={item.agente}>
                  {getShortName(item.agente)}
                </span>
              </div>
              <div className={`text-xs font-mono font-bold ${textDark} text-right bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100 shrink-0 w-[30%] flex justify-center`}>
                {formatFunc(item[key])}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-6">
      {renderColumn('prod', 'Productiv.', pct, 'text-blue-600')}
      {renderColumn('adh', 'Adherencia', pct, 'text-teal-600')}
      {renderColumn('ocup', 'Ocupación', pct, 'text-orange-600')}
      {renderColumn('tmo', 'TMO Global', (v) => secToTime(v, true), 'text-indigo-600')}
      {renderColumn('pacw', 'Prom. ACW', (v) => secToTime(v, true), 'text-slate-600')}
      {renderColumn('cortas', 'Llam. Cortas', num, 'text-orange-600')}
      {renderColumn('plinea', 'Prom. Línea', (v) => secToTime(v, true), 'text-indigo-600')}
      {renderColumn('contact', 'Contactab.', pctDec, 'text-blue-600')}
    </div>
  );
}
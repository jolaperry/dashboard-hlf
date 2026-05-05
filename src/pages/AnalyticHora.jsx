import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, Activity, X, ChevronDown } from 'lucide-react';

const AGENTES_EXCLUIDOS = ['BELFRED BELIS', 'KATYA CACERES', 'OLIVER FLACCO'];

const HORA_INICIO = 7;
const HORA_FIN = 20;
const HORAS_FIJAS = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i);

const MODULOS = ['BLOQUEO', 'INGRESOS', 'FDS', 'MESA CENTRAL'];
const COLORES_MOD = {
  'BLOQUEO': '#3b82f6',
  'INGRESOS': '#10b981',
  'FDS': '#f97316',
  'MESA CENTRAL': '#a855f7'
};
const GLOWS_MOD = {
  'BLOQUEO': 'rgba(59,130,246,0.22)',
  'INGRESOS': 'rgba(16,185,129,0.22)',
  'FDS': 'rgba(249,115,22,0.22)',
  'MESA CENTRAL': 'rgba(168,85,247,0.22)'
};

const cleanHTML = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
};

const normalizeAgentName = (name) => {
  if (!name) return 'DESCONOCIDO';
  let std = cleanHTML(name).toLowerCase().trim().replace(/\./g, ' ');
  const dict = {
    'oscar hidalgo': 'OSCAR HIDALGO', 'carla garay': 'CARLA GARAY',
    'lorena rodriguez': 'LORENA RODRIGUEZ', 'angelica galleguillos': 'ANGELICA GALLEGUILLOS',
    'andreina villalon': 'ANDREINA VILLALON', 'jorge yanez': 'JORGE YANEZ',
    'cristobal fernandez': 'CRISTOBAL FERNANDEZ', 'miriam bruges': 'MIRIAM BRUGES',
    'maria faria': 'MARIA FARIA', 'maria farias': 'MARIA FARIA',
    'yessenia gonzalez': 'YESSENIA GONZALEZ', 'lesli agudelo': 'LESLI AGUDELO',
    'joanna rojas': 'JOANNA ROJAS', 'johanna herrera': 'JOHANNA HERRERA',
    'joanna herrera': 'JOHANNA HERRERA', 'saymar paez': 'SAYMAR PAEZ',
    'diego cea': 'DIEGO CEA', 'edith ossandon': 'EDITH OSSANDON',
    'cristina baron': 'CRISTINA BARON', 'paola herrera': 'PAOLA HERRERA',
    'adrian manzanilla': 'ADRIAN MANZANILLA'
  };
  if (dict[std]) return dict[std];
  std = std.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return std.replace(/\s+/g, ' ').trim();
};

const getAgentFromRow = (row) => {
  const rowStr = JSON.stringify(row).toLowerCase();
  const dict = {
    'oscar hidalgo': 'OSCAR HIDALGO', 'carla garay': 'CARLA GARAY', 'lorena rodriguez': 'LORENA RODRIGUEZ',
    'andreina villalon': 'ANDREINA VILLALON', 'jorge yanez': 'JORGE YANEZ', 'johanna herrera': 'JOHANNA HERRERA'
  };
  for (let key in dict) {
    if (rowStr.includes(key) || rowStr.includes(key.replace(' ', '.'))) return dict[key];
  }
  const rawAg = row['5'] || row[5] || row.Agente || '';
  const normalized = normalizeAgentName(rawAg);
  if (normalized.includes('IVR') || normalized === 'IA' || normalized === 'AGENTE IA') return 'DESCONOCIDO';
  return normalized;
};

const extractHour = (row) => {
  const val = row['2'] || row[2] || row.Fecha || row.fecha || '';
  const cleaned = cleanHTML(val);
  const m = cleaned.match(/(\d{1,2}):\d{2}/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : null;
};

const isLlamadaValida = (estado, fullRowStr) => {
  const est = String(estado).toUpperCase().trim();
  if (!est.includes('ATENDIDA') && !est.includes('OK')) return false;
  const tUpper = String(fullRowStr).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const invalidas = ['NO CONTESTA', 'BUZON', 'NO EXISTE', 'BUZON DE VOZ', 'OCUPADO', 'FALLIDA', 'N° NO EXISTE'];
  return !invalidas.some(inv => tUpper.includes(inv));
};

const getModulo = (stdName) => {
  const n = String(stdName || '').toUpperCase();
  if (['VILLALON', 'HIDALGO', 'RODRIGUEZ', 'GALLEGUILLOS'].some(k => n.includes(k))) return 'BLOQUEO';
  if (['BRUGES', 'FERNANDEZ', 'GARAY', 'YANEZ'].some(k => n.includes(k))) return 'INGRESOS';
  if (['PAEZ', 'ROJAS'].some(k => n.includes(k))) return 'FDS';
  return 'MESA CENTRAL';
};

// Cardinal-spline path
const smoothPath = (points, tension = 0.4) => {
  if (points.length < 2) return '';
  const out = [`M${points[0][0]},${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 3;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension / 3;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 3;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension / 3;
    out.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
  }
  return out.join(' ');
};

const HourCurve = ({ horas, valoresPrincipal, valoresSecundario, agenteSecundario, peak, peakHour, avg, modoLabel }) => {
  const w = 1400, h = 380;
  const padL = 50, padR = 30, padT = 40, padB = 38;
  const N = horas.length;
  if (N === 0) {
    return <div className="h-72 flex items-center justify-center text-xs text-slate-500 italic">Sin actividad para graficar.</div>;
  }
  const yMaxRaw = Math.max(peak, ...(valoresSecundario || [0]));
  const niceCeil = (v) => {
    if (v <= 10) return 10;
    const step = Math.pow(10, Math.floor(Math.log10(v)));
    const norm = v / step;
    let mult;
    if (norm <= 1) mult = 1;
    else if (norm <= 2) mult = 2;
    else if (norm <= 5) mult = 5;
    else mult = 10;
    return mult * step;
  };
  const yMax = yMaxRaw > 0 ? niceCeil(yMaxRaw * 1.1) : 10;
  const xStep = (w - padL - padR) / Math.max(1, N - 1);

  const toPoints = (vals) => vals.map((v, i) => [
    padL + i * xStep,
    padT + (h - padT - padB) * (1 - v / yMax)
  ]);

  const ptsA = toPoints(valoresPrincipal);
  const pathA = smoothPath(ptsA);
  const fillA = ptsA.length
    ? `${pathA} L${ptsA[ptsA.length - 1][0]},${h - padB} L${ptsA[0][0]},${h - padB} Z`
    : '';

  const ptsB = valoresSecundario && valoresSecundario.length === N ? toPoints(valoresSecundario) : null;
  const pathB = ptsB ? smoothPath(ptsB) : '';

  const avgY = padT + (h - padT - padB) * (1 - avg / yMax);
  const peakIdx = valoresPrincipal.indexOf(peak);
  const peakPt = peakIdx >= 0 ? ptsA[peakIdx] : null;

  const ticks = 7;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((yMax / ticks) * i));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[380px]" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t, i) => {
        const y = padT + (h - padT - padB) * (1 - t / yMax);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
            <text x={padL - 8} y={y + 4} fontSize="11" fill="#64748b" textAnchor="end" fontFamily="monospace">{t}</text>
          </g>
        );
      })}

      <line x1={padL} y1={avgY} x2={w - padR} y2={avgY} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 5" opacity="0.6" />

      <path d={fillA} fill="url(#curveFill)" />
      <path d={pathA} stroke="#22d3ee" strokeWidth="2.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />

      {ptsA.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.6" />
      ))}

      {pathB && (
        <>
          <path d={pathB} stroke="#f43f5e" strokeWidth="2.4" fill="none" strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
          {ptsB.map((p, i) => (
            <circle key={`b-${i}`} cx={p[0]} cy={p[1]} r="2.8" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.6" />
          ))}
        </>
      )}

      {peakPt && (
        <g>
          <circle cx={peakPt[0]} cy={peakPt[1]} r="9" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
          <circle cx={peakPt[0]} cy={peakPt[1]} r="13" fill="none" stroke="#facc15" strokeOpacity="0.5" strokeWidth="1.5">
            <animate attributeName="r" values="11;17;11" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.55;0;0.55" dur="2.2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {horas.map((hr, i) => (
        <text key={i} x={padL + i * xStep} y={h - padB + 18} fontSize="11" fill="#64748b" textAnchor="middle" fontFamily="monospace">
          {String(hr).padStart(2, '0')}:00
        </text>
      ))}

      <g transform={`translate(${(w / 2) - 150}, ${padT - 26})`}>
        <rect x="0" y="-12" width="160" height="22" rx="4" fill="#0f172a" stroke="#1e293b" />
        <rect x="10" y="-3" width="14" height="6" fill="#22d3ee" rx="1" />
        <text x="30" y="3" fontSize="11" fill="#cbd5e1" fontFamily="ui-sans-serif, system-ui">{modoLabel}</text>
      </g>
      {agenteSecundario && (
        <g transform={`translate(${(w / 2) + 20}, ${padT - 26})`}>
          <rect x="0" y="-12" width="220" height="22" rx="4" fill="#0f172a" stroke="#1e293b" />
          <line x1="10" y1="0" x2="24" y2="0" stroke="#f43f5e" strokeWidth="2.4" strokeDasharray="4 3" />
          <text x="30" y="3" fontSize="11" fill="#cbd5e1" fontFamily="ui-sans-serif, system-ui">{agenteSecundario}</text>
        </g>
      )}
      <g transform={`translate(${(w / 2) + 250}, ${padT - 26})`}>
        <rect x="0" y="-12" width="180" height="22" rx="4" fill="#0f172a" stroke="#1e293b" />
        <line x1="10" y1="0" x2="24" y2="0" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 4" />
        <text x="30" y="3" fontSize="11" fill="#94a3b8" fontFamily="ui-sans-serif, system-ui">Promedio · {avg.toFixed(1)}/h</text>
      </g>
    </svg>
  );
};

const AgentBars = ({ valores, max, color, horas }) => {
  const peak = max;
  return (
    <div className="flex items-end gap-[3px] h-[72px] w-full">
      {valores.map((v, i) => {
        const heightPct = peak > 0 ? (v / peak) * 100 : 0;
        const isPeak = v === peak && v > 0;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${heightPct}%`,
              backgroundColor: isPeak ? color : `${color}66`,
              minHeight: v > 0 ? '4px' : '0px',
              boxShadow: isPeak ? `0 0 8px ${color}77` : 'none'
            }}
            title={`${horas[i]}:00 → ${v}`}
          />
        );
      })}
    </div>
  );
};

const AgentCard = ({ agente, modulo, total, valores, peak, peakHour, horas }) => {
  const color = COLORES_MOD[modulo];
  const glow = GLOWS_MOD[modulo];
  return (
    <div
      className="bg-slate-900/60 backdrop-blur-sm rounded-xl border-t-2 border-l border-r border-b border-slate-800 p-3.5 flex flex-col gap-2 transition-all hover:bg-slate-900/80 hover:scale-[1.01]"
      style={{ borderTopColor: color, boxShadow: `0 0 14px ${glow}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[12px] font-black text-white tracking-tight truncate uppercase">{agente}</h3>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color }}>{modulo}</span>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Total</p>
          <p className="text-xl font-black text-white tabular-nums leading-tight">{total}</p>
        </div>
      </div>

      <AgentBars valores={valores} max={peak} color={color} horas={horas} />

      <div className="flex items-end justify-between text-[9px] font-mono">
        <span className="text-slate-600">{horas[0] !== undefined ? `${String(horas[0]).padStart(2, '0')}h` : ''}</span>
        <span className="text-slate-600">{horas[horas.length - 1] !== undefined ? `${String(horas[horas.length - 1]).padStart(2, '0')}h` : ''}</span>
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pico</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color }}>
          {peakHour !== null && peak > 0 ? `${String(peakHour).padStart(2, '0')}:00 · ${peak}` : '—'}
        </span>
      </div>
    </div>
  );
};

const ModuloPill = ({ nombre, color, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5"
    style={{
      backgroundColor: isActive ? `${color}33` : `${color}14`,
      borderColor: isActive ? color : `${color}55`,
      color,
      boxShadow: isActive ? `0 0 12px ${color}55` : 'none'
    }}
  >
    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
    {nombre}
  </button>
);

const AnalyticHora = () => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const [fechaDesde, setFechaDesde] = useState(today);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [llamadas, setLlamadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroEjecutivo, setFiltroEjecutivo] = useState('');
  const [modoCurva, setModoCurva] = useState('atendidas'); // 'atendidas' | 'totales'
  const [agenteComparado, setAgenteComparado] = useState('');

  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/llamadas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaDesde, fechaHasta })
      });
      const raw = await res.json();
      if (!raw.data) throw new Error('Error en api/llamadas');

      const rows = raw.data.map(row => {
        const ag = getAgentFromRow(row);
        const hora = extractHour(row);
        const estado = cleanHTML(row.Estado || row['0'] || row[0] || '');
        const fullRowStr = JSON.stringify(row).toUpperCase();
        const atendida = isLlamadaValida(estado, fullRowStr);
        return { agente: ag, hora, modulo: getModulo(ag), atendida };
      }).filter(r => r.agente !== 'DESCONOCIDO' && !AGENTES_EXCLUIDOS.includes(r.agente) && r.hora !== null);

      setLlamadas(rows);
    } catch (err) {
      console.error(err);
      setError('Error procesando los reportes. Revisa consola.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [fechaDesde, fechaHasta]);

  const ejecutivos = useMemo(
    () => Array.from(new Set(llamadas.map(l => l.agente))).sort(),
    [llamadas]
  );

  const stats = useMemo(() => {
    const matchModulo = (m) => !filtroModulo || m === filtroModulo;
    const matchEj = (a) => !filtroEjecutivo || a === filtroEjecutivo;
    const matchModo = (a) => modoCurva === 'totales' ? true : a;

    const filtered = llamadas.filter(l => matchModulo(l.modulo) && matchEj(l.agente) && l.hora >= HORA_INICIO && l.hora <= HORA_FIN);

    const horas = HORAS_FIJAS;

    if (filtered.length === 0) {
      const cero = horas.map(() => 0);
      return { horas, totales: cero, atendidas: cero, peak: 0, peakHour: null, avg: 0, agentesData: [], totalLlamadas: 0, totalAtendidas: 0 };
    }

    const totales = horas.map(h => filtered.filter(l => l.hora === h).length);
    const atendidas = horas.map(h => filtered.filter(l => l.hora === h && l.atendida).length);

    const valoresCurva = modoCurva === 'totales' ? totales : atendidas;
    const peak = valoresCurva.length ? Math.max(...valoresCurva) : 0;
    const peakHour = peak > 0 ? horas[valoresCurva.indexOf(peak)] : null;
    const avg = valoresCurva.length ? valoresCurva.reduce((a, b) => a + b, 0) / valoresCurva.length : 0;

    // Agentes (independiente del filtro de ejecutivo, respeta módulo)
    const llamadasAgentes = llamadas.filter(l => matchModulo(l.modulo));
    const agentesAll = Array.from(new Set(llamadasAgentes.map(l => l.agente))).sort();
    const agentesData = agentesAll.map(ag => {
      const valoresPorHora = horas.map(h =>
        llamadasAgentes.filter(l => l.agente === ag && l.hora === h && matchModo(l.atendida)).length
      );
      const total = valoresPorHora.reduce((a, b) => a + b, 0);
      const peakAg = valoresPorHora.length ? Math.max(...valoresPorHora) : 0;
      const peakHourAg = peakAg > 0 ? horas[valoresPorHora.indexOf(peakAg)] : null;
      return {
        agente: ag,
        modulo: getModulo(ag),
        valoresPorHora,
        total,
        peak: peakAg,
        peakHour: peakHourAg
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

    return {
      horas,
      totales,
      atendidas,
      peak,
      peakHour,
      avg,
      agentesData,
      totalLlamadas: filtered.length,
      totalAtendidas: filtered.filter(l => l.atendida).length
    };
  }, [llamadas, filtroModulo, filtroEjecutivo, modoCurva]);

  const valoresPrincipal = modoCurva === 'totales' ? stats.totales : stats.atendidas;
  const modoLabel = modoCurva === 'totales'
    ? `Totales${filtroEjecutivo ? ` (${filtroEjecutivo})` : filtroModulo ? ` (${filtroModulo})` : ' (todos)'}`
    : `Atendidas${filtroEjecutivo ? ` (${filtroEjecutivo})` : filtroModulo ? ` (${filtroModulo})` : ' (todos)'}`;

  // Curva del agente comparado
  const valoresSecundario = useMemo(() => {
    if (!agenteComparado || !stats.horas.length) return null;
    return stats.horas.map(h =>
      llamadas.filter(l => l.agente === agenteComparado && l.hora === h && (modoCurva === 'totales' ? true : l.atendida)).length
    );
  }, [agenteComparado, llamadas, stats.horas, modoCurva]);

  const totalDisplayed = modoCurva === 'totales' ? stats.totalLlamadas : stats.totalAtendidas;

  return (
    <div className="p-4 min-h-screen font-sans">
      {/* HEADER */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md px-5 py-4 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-wide">Analytics</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">HLF · Distribución horaria de llamadas</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-md text-xs text-slate-200 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-md text-xs text-slate-200 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ejecutivo</label>
            <select
              value={filtroEjecutivo}
              onChange={(e) => setFiltroEjecutivo(e.target.value)}
              className="bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-md text-xs text-slate-200 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all min-w-[180px]"
            >
              <option value="">Todos</option>
              {ejecutivos.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 border border-cyan-500/40 text-cyan-300 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* MODULE PILLS */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {MODULOS.map(mod => (
          <ModuloPill
            key={mod}
            nombre={mod}
            color={COLORES_MOD[mod]}
            isActive={filtroModulo === mod}
            onClick={() => setFiltroModulo(filtroModulo === mod ? '' : mod)}
          />
        ))}
        {(filtroModulo || filtroEjecutivo) && (
          <button
            onClick={() => { setFiltroModulo(''); setFiltroEjecutivo(''); }}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-all"
          >
            Limpiar
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-rose-950/40 text-rose-300 rounded-xl flex items-center gap-2 border border-rose-800/60 text-xs font-medium">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* CURVA */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border-t-2 border-cyan-500 border-l border-r border-b border-slate-800 mb-6 shadow-[0_0_18px_rgba(6,182,212,0.18)]">
        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center gap-3 bg-slate-900/80">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-300 tracking-widest uppercase">Curva por Hora</h2>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
            {totalDisplayed} {modoCurva === 'totales' ? 'llamadas' : 'atendidas'}
          </span>
          {stats.peakHour !== null && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">
              Pico {String(stats.peakHour).padStart(2, '0')}:00 · {stats.peak}
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-purple-500/15 border border-purple-500/40 text-purple-300">
            Promedio {stats.avg.toFixed(1)}/h
          </span>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex bg-slate-800 border border-slate-700 rounded-md overflow-hidden">
              <button
                onClick={() => setModoCurva('atendidas')}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-all ${modoCurva === 'atendidas' ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Atendidas
              </button>
              <button
                onClick={() => setModoCurva('totales')}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-all ${modoCurva === 'totales' ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Totales
              </button>
            </div>

            {!agenteComparado ? (
              <div className="relative">
                <select
                  value={agenteComparado}
                  onChange={(e) => setAgenteComparado(e.target.value)}
                  className="appearance-none bg-slate-800 border border-slate-700 pl-3 pr-8 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-slate-300 outline-none focus:border-cyan-500 transition-all"
                >
                  <option value="">+ Comparar agente</option>
                  {ejecutivos.filter(a => a !== filtroEjecutivo).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/40 text-rose-200 pl-3 pr-1.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
                {agenteComparado}
                <button
                  onClick={() => setAgenteComparado('')}
                  className="p-0.5 rounded hover:bg-rose-500/25"
                  aria-label="Quitar comparación"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-3 py-3">
          <HourCurve
            horas={stats.horas}
            valoresPrincipal={valoresPrincipal}
            valoresSecundario={valoresSecundario}
            agenteSecundario={agenteComparado}
            peak={stats.peak}
            peakHour={stats.peakHour}
            avg={stats.avg}
            modoLabel={modoLabel}
          />
        </div>
      </div>

      {/* DISTRIBUCIÓN POR AGENTE */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-bold text-purple-300 tracking-widest uppercase">Distribución por Agente</h2>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
          {stats.agentesData.length} agentes
        </span>
        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Ordenado por volumen · cada barra = una hora
        </span>
      </div>

      {stats.agentesData.length === 0 ? (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 px-4 py-12 text-center text-slate-500 text-xs uppercase tracking-widest font-bold">
          Sin datos disponibles para el rango seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {stats.agentesData.map((d) => (
            <AgentCard
              key={d.agente}
              agente={d.agente}
              modulo={d.modulo}
              total={d.total}
              valores={d.valoresPorHora}
              peak={d.peak}
              peakHour={d.peakHour}
              horas={stats.horas}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalyticHora;

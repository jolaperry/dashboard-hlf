import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, Clock, Coffee, FileText, GraduationCap } from 'lucide-react';

const AGENTES_EXCLUIDOS = ['BELFRED BELIS', 'KATYA CACERES', 'OLIVER FLACCO'];

const cleanHTML = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
};

const timeToSeconds = (t) => {
  if (!t || t === '-' || t === '—') return 0;
  const parts = t.toString().trim().replace(/[^\d:]/g, '').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

const parseTiempoCelda = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(val * 86400);
  if (val instanceof Date) return val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds();
  return timeToSeconds(cleanHTML(String(val)));
};

const fmtSec = (s) => {
  if (!s || isNaN(s) || s <= 0) return '00:00:00';
  const h = Math.floor(s / 3600);
  const mi = Math.floor((s % 3600) / 60);
  const sc = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(sc).padStart(2, '00')}`;
};

const extractTimeStr = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'number') {
    const t = Math.round(val * 86400);
    const h = Math.floor(t / 3600), mi = Math.floor((t % 3600) / 60), sc = Math.floor(t % 60);
    return `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'00')}:${String(sc).padStart(2,'00')}`;
  }
  const str = String(val);
  const mHTML = str.match(/>\s*([^<]+)\s*</);
  if (mHTML?.[1]) return mHTML[1].trim();
  const mTime = str.match(/\d{1,2}:\d{2}(:\d{2})?/);
  if (mTime) return mTime[0];
  return cleanHTML(str) || '—';
};

const normalizeAgent = (name) => {
  if (!name) return 'DESCONOCIDO';
  let s = cleanHTML(name).toLowerCase().trim().replace(/\./g, ' ');
  const dict = {
    'oscar hidalgo': 'OSCAR HIDALGO', 'carla garay': 'CARLA GARAY', 'lorena rodriguez': 'LORENA RODRIGUEZ',
    'angelica galleguillos': 'ANGELICA GALLEGUILLOS', 'andreina villalon': 'ANDREINA VILLALON',
    'jorge yanez': 'JORGE YANEZ', 'cristobal fernandez': 'CRISTOBAL FERNANDEZ', 'miriam bruges': 'MIRIAM BRUGES',
    'maria faria': 'MARIA FARIA', 'maria farias': 'MARIA FARIA', 'yessenia gonzalez': 'YESSENIA GONZALEZ',
    'lesli agudelo': 'LESLI AGUDELO', 'joanna rojas': 'JOANNA ROJAS', 'johanna herrera': 'JOHANNA HERRERA',
    'joanna herrera': 'JOHANNA HERRERA', 'saymar paez': 'SAYMAR PAEZ', 'diego cea': 'DIEGO CEA',
    'edith ossandon': 'EDITH OSSANDON', 'cristina baron': 'CRISTINA BARON', 'paola herrera': 'PAOLA HERRERA',
    'adrian manzanilla': 'ADRIAN MANZANILLA'
  };
  if (dict[s]) return dict[s];
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
};

const extractDateFromRaw = (rawFecha, fechaDesde) => {
  if (!rawFecha) return fechaDesde;
  const cleaned = cleanHTML(String(rawFecha));
  const mISO = cleaned.match(/\d{4}-\d{2}-\d{2}/);
  if (mISO) return mISO[0];
  const mDMY = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mDMY) return `${mDMY[3]}-${mDMY[2].padStart(2,'0')}-${mDMY[1].padStart(2,'0')}`;
  const mDMYd = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mDMYd) return `${mDMYd[3]}-${mDMYd[2].padStart(2,'0')}-${mDMYd[1].padStart(2,'0')}`;
  return cleaned.split(' ')[0] || fechaDesde;
};

const Stat = ({ label, value, color, Icon }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60">
    {Icon && <Icon className="w-3 h-3 shrink-0" style={{ color }} />}
    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    <span className="text-xs font-black font-mono tabular-nums" style={{ color }}>{value}</span>
  </div>
);

const TiemposEstados = () => {
  const now = new Date();
  const [mes, setMes] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroAgente, setFiltroAgente] = useState('');

  const [anio, mesNum] = mes.split('-').map(Number);
  const fechaDesde = `${mes}-01`;
  const fechaHasta = `${mes}-${String(new Date(anio, mesNum, 0).getDate()).padStart(2, '0')}`;

  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/archivo-excel-agentes?startDate=${fechaDesde}&endDate=${fechaHasta}`
      );
      const raw = await res.json();
      if (!raw.data) throw new Error('Sin datos del Excel');

      const result = raw.data.map(ra => {
        const ag = normalizeAgent(ra.Agente || ra.agente || '');
        if (ag === 'DESCONOCIDO' || AGENTES_EXCLUIDOS.includes(ag)) return null;
        const fecha = extractDateFromRaw(ra.Fecha || ra.fecha, fechaDesde);
        return {
          agente: ag,
          fecha,
          inicioStr: extractTimeStr(ra['Inicio Turno'] || ra['Inicio_Turno'] || ''),
          breakSeg:  parseTiempoCelda(ra['Break'] || ra['Tiempo Break'] || ''),
          admSeg:    parseTiempoCelda(ra['Administrativo'] || ra['Back Office'] || ra['Reunion'] || ra['Reunión'] || ''),
          capSeg:    parseTiempoCelda(ra['Capacitación'] || ra['Capacitacion'] || ra['Training'] || ''),
        };
      }).filter(Boolean);

      setFilas(result);
    } catch (err) {
      console.error(err);
      setError('Error al cargar los datos del Excel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [mes]);

  const agentes = useMemo(() => Array.from(new Set(filas.map(f => f.agente))).sort(), [filas]);

  const filtradas = useMemo(() => {
    const base = filtroAgente ? filas.filter(r => r.agente === filtroAgente) : filas;
    return [...base].sort((a, b) =>
      b.fecha.localeCompare(a.fecha) || a.agente.localeCompare(b.agente)
    );
  }, [filas, filtroAgente]);

  const glob = useMemo(() => filtradas.reduce(
    (acc, r) => ({ brk: acc.brk + r.breakSeg, adm: acc.adm + r.admSeg, cap: acc.cap + r.capSeg }),
    { brk: 0, adm: 0, cap: 0 }
  ), [filtradas]);

  return (
    <div className="p-3 min-h-screen font-sans flex flex-col gap-2">

      {/* HEADER COMPACTO */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-black text-white">Tiempos por Estado</span>
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest hidden sm:block">· HLF Mensual</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-slate-200 outline-none focus:border-amber-500 transition-all"
          />
          <select
            value={filtroAgente}
            onChange={e => setFiltroAgente(e.target.value)}
            className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-slate-200 outline-none focus:border-amber-500 min-w-[160px] transition-all"
          >
            <option value="">Todos los agentes</option>
            {agentes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {filtroAgente && (
            <button
              onClick={() => setFiltroAgente('')}
              className="text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2 py-1 rounded hover:bg-rose-500/30 transition-all"
            >
              ✕ Limpiar
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 border border-amber-500/40 text-amber-300 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-rose-950/40 text-rose-300 rounded-lg flex items-center gap-2 border border-rose-800/60 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* BARRA DE TOTALES */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Totales del período:</span>
        <Stat label="Registros" value={filtradas.length} color="#22d3ee" Icon={Clock} />
        <Stat label="Break" value={fmtSec(glob.brk)} color="#f59e0b" Icon={Coffee} />
        <Stat label="Administrativo" value={fmtSec(glob.adm)} color="#6366f1" Icon={FileText} />
        <Stat label="Capacitación" value={fmtSec(glob.cap)} color="#10b981" Icon={GraduationCap} />
      </div>

      {/* TABLA */}
      <div className="bg-slate-900/60 rounded-lg border-t-2 border-amber-500 border-l border-r border-b border-slate-800 overflow-hidden shadow-[0_0_14px_rgba(245,158,11,0.15)] flex-1">
        <div className="overflow-x-auto scroller">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-slate-950/70 border-b border-slate-800 sticky top-0">
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-3 py-2 text-left">Agente</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-center text-cyan-300">Inicio Turno</th>
                <th className="px-3 py-2 text-right text-amber-300">Break</th>
                <th className="px-3 py-2 text-right text-indigo-300">Administrativo</th>
                <th className="px-3 py-2 text-right text-emerald-300">Capacitación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-[11px]">
              {filtradas.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-1 font-semibold text-slate-100">{r.agente}</td>
                  <td className="px-3 py-1 text-slate-500 font-mono tabular-nums">{r.fecha}</td>
                  <td className="px-3 py-1 text-center font-mono text-cyan-300 tabular-nums">{r.inicioStr}</td>
                  <td className="px-3 py-1 text-right font-mono tabular-nums text-amber-300">{fmtSec(r.breakSeg)}</td>
                  <td className="px-3 py-1 text-right font-mono tabular-nums text-indigo-300">{fmtSec(r.admSeg)}</td>
                  <td className="px-3 py-1 text-right font-mono tabular-nums text-emerald-300">{fmtSec(r.capSeg)}</td>
                </tr>
              ))}
              {filtradas.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500 text-[11px] uppercase tracking-widest font-bold">
                    Sin datos para el mes seleccionado.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500 text-[11px] uppercase tracking-widest font-bold animate-pulse">
                    Cargando datos del mes...
                  </td>
                </tr>
              )}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot className="border-t-2 border-slate-700 bg-slate-950/80 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <td className="px-3 py-1.5 text-slate-500" colSpan="3">Total período</td>
                  <td className="px-3 py-1.5 text-right font-mono text-amber-300 tabular-nums">{fmtSec(glob.brk)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-indigo-300 tabular-nums">{fmtSec(glob.adm)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-300 tabular-nums">{fmtSec(glob.cap)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default TiemposEstados;

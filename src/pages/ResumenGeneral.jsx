import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, List, Phone, PhoneOff, Target, PhoneCall } from 'lucide-react';

const AGENTES_EXCLUIDOS = ['BELFRED BELIS', 'KATYA CACERES', 'OLIVER FLACCO'];

const cleanHTML = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
};

const timeToSeconds = (t) => {
  if (!t || t === '-' || t === '') return 0;
  const parts = t.toString().trim().replace(/[^\d:]/g, '').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

const fmtSec = (s) => {
  if (!s || isNaN(s) || s < 0) return '00:00:00';
  const h = Math.floor(s / 3600);
  const mi = Math.floor((s % 3600) / 60);
  const sc = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(sc).padStart(2, '0')}`;
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

const getAgent = (row) => {
  const rs = JSON.stringify(row).toLowerCase();
  const dict = {
    'oscar hidalgo': 'OSCAR HIDALGO', 'carla garay': 'CARLA GARAY', 'lorena rodriguez': 'LORENA RODRIGUEZ',
    'andreina villalon': 'ANDREINA VILLALON', 'jorge yanez': 'JORGE YANEZ', 'johanna herrera': 'JOHANNA HERRERA'
  };
  for (const key in dict) {
    if (rs.includes(key) || rs.includes(key.replace(' ', '.'))) return dict[key];
  }
  const raw = row['5'] || row[5] || row.Agente || '';
  const n = normalizeAgent(raw);
  if (n.includes('IVR') || n === 'IA' || n === 'AGENTE IA') return 'DESCONOCIDO';
  return n;
};

const isValid = (estado, rowStr) => {
  const e = String(estado).toUpperCase().trim();
  if (!e.includes('ATENDIDA') && !e.includes('OK')) return false;
  const u = String(rowStr).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return !['NO CONTESTA', 'BUZON', 'NO EXISTE', 'BUZON DE VOZ', 'OCUPADO', 'FALLIDA', 'N° NO EXISTE'].some(x => u.includes(x));
};

const extractDate = (row, fallback) => {
  const val = row['2'] || row[2] || row.Fecha || row.fecha;
  if (!val) return fallback;
  const cleaned = cleanHTML(val);
  const m = cleaned.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : (cleaned.split(' ')[0] || fallback);
};

const KpiCard = ({ label, value, sub, color, Icon }) => (
  <div
    className="bg-slate-900/60 backdrop-blur-sm rounded-xl border-t-2 border-l border-r border-b border-slate-800 px-4 py-3.5 flex flex-col"
    style={{ borderTopColor: color, boxShadow: `0 0 16px ${color}28` }}
  >
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</p>
      {Icon && <Icon className="w-3.5 h-3.5 opacity-60" style={{ color }} />}
    </div>
    <p className="text-2xl font-black text-white tabular-nums leading-none">{value}</p>
    {sub && <p className="text-[9px] text-slate-500 mt-auto pt-2 border-t border-slate-800 font-mono uppercase tracking-wider">{sub}</p>}
  </div>
);

const ResumenGeneral = () => {
  const now = new Date();
  const [mes, setMes] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [error, setError] = useState(null);
  const [filtroAgente, setFiltroAgente] = useState('');

  const [anio, mesNum] = mes.split('-').map(Number);
  const fechaDesde = `${mes}-01`;
  const fechaHasta = `${mes}-${String(new Date(anio, mesNum, 0).getDate()).padStart(2, '0')}`;

  // Divide el mes en chunks de 7 días para no saturar Render con un solo request
  const buildChunks = (desde, hasta) => {
    const chunks = [];
    let cur = new Date(desde);
    const end = new Date(hasta);
    while (cur <= end) {
      const chunkStart = cur.toISOString().slice(0, 10);
      const chunkEnd = new Date(Math.min(cur.getTime() + 6 * 86400000, end.getTime()))
        .toISOString().slice(0, 10);
      chunks.push({ from: chunkStart, to: chunkEnd });
      cur = new Date(cur.getTime() + 7 * 86400000);
    }
    return chunks;
  };

  const processRows = (rows, map, fallbackDate) => {
    rows.forEach(row => {
      const ag = getAgent(row);
      if (ag === 'DESCONOCIDO' || AGENTES_EXCLUIDOS.includes(ag)) return;
      const fecha = extractDate(row, fallbackDate);
      const estado = cleanHTML(row.Estado || row['0'] || row[0] || '');
      const rowStr = JSON.stringify(row).toUpperCase();
      const atendida = isValid(estado, rowStr);
      const rawTime = row['10'] || row[10] || row['Tiempo de Llamada'] || row['Duracion'];
      let durStr = '00:00:00';
      if (rawTime) {
        const match = String(rawTime).match(/>\s*([^<]+)\s*</);
        durStr = match?.[1]?.trim() ?? cleanHTML(rawTime);
      }
      const dur = timeToSeconds(durStr);
      const key = `${fecha}||${ag}`;
      if (!map.has(key)) map.set(key, { agente: ag, fecha, at: 0, tAt: 0, noAt: 0, tNoAt: 0 });
      const r = map.get(key);
      if (atendida) { r.at++; r.tAt += dur; } else { r.noAt++; r.tNoAt += dur; }
    });
  };

  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setFilas([]);
    const chunks = buildChunks(fechaDesde, fechaHasta);
    setProgreso({ actual: 0, total: chunks.length });
    const map = new Map();
    try {
      for (let i = 0; i < chunks.length; i++) {
        const { from, to } = chunks[i];
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/llamadas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fechaDesde: from, fechaHasta: to })
        });
        const raw = await res.json();
        if (raw.data) processRows(raw.data, map, from);
        setProgreso({ actual: i + 1, total: chunks.length });
      }
      setFilas(Array.from(map.values()).map(r => ({
        ...r,
        total: r.at + r.noAt,
        tTotal: r.tAt + r.tNoAt,
        contac: (r.at + r.noAt) > 0 ? (r.at / (r.at + r.noAt)) * 100 : 0,
      })));
    } catch (err) {
      console.error(err);
      setError('Error al cargar los datos. Revisa consola.');
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
    (acc, r) => ({
      at: acc.at + r.at, noAt: acc.noAt + r.noAt,
      tAt: acc.tAt + r.tAt, tNoAt: acc.tNoAt + r.tNoAt,
      total: acc.total + r.total, tTotal: acc.tTotal + r.tTotal,
    }),
    { at: 0, noAt: 0, tAt: 0, tNoAt: 0, total: 0, tTotal: 0 }
  ), [filtradas]);

  const gContact = glob.total > 0 ? (glob.at / glob.total * 100).toFixed(1) : '0.0';

  return (
    <div className="p-4 min-h-screen font-sans">
      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md px-5 py-4 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
            <List className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-wide">Resumen General</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">HLF · Resumen mensual de llamadas</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mes</label>
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-md text-xs text-slate-200 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Agente</label>
            <select
              value={filtroAgente}
              onChange={e => setFiltroAgente(e.target.value)}
              className="bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-md text-xs text-slate-200 outline-none focus:border-cyan-500 min-w-[180px] transition-all"
            >
              <option value="">Todos</option>
              {agentes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {filtroAgente && (
            <button
              onClick={() => setFiltroAgente('')}
              className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-rose-500/30"
            >
              Limpiar
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 border border-cyan-500/40 text-cyan-300 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-rose-950/40 text-rose-300 rounded-xl flex items-center gap-2 border border-rose-800/60 text-xs font-medium">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Llamados" value={glob.total.toLocaleString()} sub={`Período: ${fechaDesde} → ${fechaHasta}`} color="#22d3ee" Icon={PhoneCall} />
        <KpiCard label="Atendidos" value={glob.at.toLocaleString()} sub={fmtSec(glob.tAt)} color="#10b981" Icon={Phone} />
        <KpiCard label="No Atendidos" value={glob.noAt.toLocaleString()} sub={fmtSec(glob.tNoAt)} color="#f43f5e" Icon={PhoneOff} />
        <KpiCard label="Contactabilidad" value={`${gContact}%`} sub="Atendidos / Total" color="#a855f7" Icon={Target} />
      </div>

      {/* TABLA DETALLE */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border-t-2 border-emerald-500 border-l border-r border-b border-slate-800 overflow-hidden shadow-[0_0_18px_rgba(16,185,129,0.18)]">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <List className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-emerald-300 tracking-widest uppercase">Detalle por Agente / Día</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
              {filtradas.length} registros
            </span>
          </div>
        </div>

        <div className="overflow-x-auto scroller">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-slate-950/60 border-b border-slate-800">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-3 text-left">Agente</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-center text-emerald-300">Llamados Atendidos</th>
                <th className="px-4 py-3 text-right text-emerald-300">Tiempo Atendidos</th>
                <th className="px-4 py-3 text-center text-rose-300">Llamados No Atendidos</th>
                <th className="px-4 py-3 text-right text-rose-300">Tiempo No Atendidos</th>
                <th className="px-4 py-3 text-center text-cyan-300">Total Llamados</th>
                <th className="px-4 py-3 text-right text-cyan-300">Total Suma Tiempo</th>
                <th className="px-4 py-3 text-right text-purple-300">Contactabilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtradas.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-white">{r.agente}</td>
                  <td className="px-4 py-2.5 text-slate-400 font-mono tabular-nums">{r.fecha}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-emerald-400 tabular-nums">{r.at}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300 font-mono tabular-nums">{fmtSec(r.tAt)}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-rose-400 tabular-nums">{r.noAt}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300 font-mono tabular-nums">{fmtSec(r.tNoAt)}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-cyan-300 tabular-nums">{r.total}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300 font-mono tabular-nums">{fmtSec(r.tTotal)}</td>
                  <td
                    className="px-4 py-2.5 text-right font-bold tabular-nums"
                    style={{ color: r.contac >= 70 ? '#10b981' : r.contac >= 50 ? '#f59e0b' : '#f43f5e' }}
                  >
                    {r.contac.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-slate-500 text-xs uppercase tracking-widest font-bold">
                    Sin datos para el mes seleccionado.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 animate-pulse">
                      Cargando semana {progreso.actual} de {progreso.total}...
                    </p>
                    <div className="mx-auto w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: progreso.total ? `${(progreso.actual / progreso.total) * 100}%` : '0%' }}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot className="border-t-2 border-slate-700 bg-slate-950/80">
                <tr className="text-[10px] font-black uppercase tracking-widest">
                  <td className="px-4 py-3 text-slate-400" colSpan="2">Totales del Período</td>
                  <td className="px-4 py-3 text-center text-emerald-400 tabular-nums">{glob.at.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{fmtSec(glob.tAt)}</td>
                  <td className="px-4 py-3 text-center text-rose-400 tabular-nums">{glob.noAt.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{fmtSec(glob.tNoAt)}</td>
                  <td className="px-4 py-3 text-center text-cyan-300 tabular-nums">{glob.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{fmtSec(glob.tTotal)}</td>
                  <td className="px-4 py-3 text-right text-purple-300">{gContact}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResumenGeneral;

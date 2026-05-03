import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, List, Activity, Zap, Target, Gauge, Timer, Coffee, AlertTriangle, Radio, Phone } from 'lucide-react';

const DashboardGeneral = () => {
  const [dataLlamadas, setDataLlamadas] = useState([]);
  const [dataAgentes, setDataAgentes] = useState([]);
  const [dataDetalle, setDataDetalle] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const today = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(today);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filtroEjecutivo, setFiltroEjecutivo] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');

  const agentesExcluidos = ['BELFRED BELIS', 'KATYA CACERES', 'OLIVER FLACCO'];

  const cleanHTML = (str) => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const timeToSeconds = (timeStr) => {
    if (!timeStr || timeStr === '-' || timeStr === '') return 0;
    const cleanTime = timeStr.toString().trim().replace(/[^\d:]/g, '');
    const parts = cleanTime.split(':').map(Number);
    
    if (parts.length === 3) {
      return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    } else if (parts.length === 2) {
      return (parts[0] * 60) + parts[1];
    }
    return 0;
  };

  const formatSeconds = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatSecondsShort = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const normalizeAgentName = (name) => {
    if (!name) return 'DESCONOCIDO';
    let std = cleanHTML(name).toLowerCase().trim().replace(/\./g, ' ');

    const dict = {
      'oscar hidalgo': 'OSCAR HIDALGO',
      'carla garay': 'CARLA GARAY',
      'lorena rodriguez': 'LORENA RODRIGUEZ',
      'angelica galleguillos': 'ANGELICA GALLEGUILLOS',
      'andreina villalon': 'ANDREINA VILLALON',
      'jorge yanez': 'JORGE YANEZ',
      'cristobal fernandez': 'CRISTOBAL FERNANDEZ',
      'miriam bruges': 'MIRIAM BRUGES',
      'maria faria': 'MARIA FARIA',
      'maria farias': 'MARIA FARIA',
      'yessenia gonzalez': 'YESSENIA GONZALEZ',
      'lesli agudelo': 'LESLI AGUDELO',
      'joanna rojas': 'JOANNA ROJAS',
      'johanna herrera': 'JOHANNA HERRERA',
      'joanna herrera': 'JOHANNA HERRERA',
      'saymar paez': 'SAYMAR PAEZ',
      'diego cea': 'DIEGO CEA',
      'edith ossandon': 'EDITH OSSANDON',
      'cristina baron': 'CRISTINA BARON',
      'paola herrera': 'PAOLA HERRERA',
      'adrian manzanilla': 'ADRIAN MANZANILLA'
    };

    if (dict[std]) return dict[std];

    std = std.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
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
    
    const rawAg = row["5"] || row[5] || row.Agente || "";
    const normalized = normalizeAgentName(rawAg);
    
    if (normalized.includes('IVR') || normalized === 'IA' || normalized === 'AGENTE IA') {
      return 'DESCONOCIDO';
    }
    return normalized;
  };

  const extractDate = (row) => {
    if (fechaDesde === fechaHasta) return fechaDesde;
    const val = row["2"] || row[2] || row.Fecha || row.fecha;
    if (val) {
        const cleaned = cleanHTML(val);
        const match = cleaned.match(/\d{4}-\d{2}-\d{2}/);
        if (match) return match[0];
        return cleaned.split(' ')[0];
    }
    return today;
  };

  const getModulo = (stdName) => {
    const n = stdName.toUpperCase();
    if (['VILLALON', 'HIDALGO', 'RODRIGUEZ', 'GALLEGUILLOS'].some(k => n.includes(k))) return 'BLOQUEO';
    if (['BRUGES', 'FERNANDEZ', 'GARAY', 'YANEZ'].some(k => n.includes(k))) return 'INGRESOS';
    if (['PAEZ', 'ROJAS'].some(k => n.includes(k))) return 'FDS';
    return 'MESA CENTRAL';
  };

  const isLlamadaValida = (estado, fullRowStr) => {
    const est = String(estado).toUpperCase().trim();
    if (!est.includes('ATENDIDA') && !est.includes('OK')) return false;

    const tUpper = String(fullRowStr).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const invalidas = [
      'NO CONTESTA', 
      'BUZON', 
      'NO EXISTE', 
      'BUZON DE VOZ', 
      'OCUPADO', 
      'FALLIDA', 
      'N° NO EXISTE'
    ];
    
    return !invalidas.some(inv => tUpper.includes(inv));
  };

  const fetchAutomatedData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const resLlamadas = await fetch(`${import.meta.env.VITE_API_URL}/api/llamadas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaDesde, fechaHasta })
      });
      const rawLlamadas = await resLlamadas.json();
      
      if (!rawLlamadas.data) throw new Error("Error en api/llamadas");

      const resAgentes = await fetch(`${import.meta.env.VITE_API_URL}/api/archivo-excel-agentes?startDate=${fechaDesde}&endDate=${fechaHasta}`);
      const rawAgentes = await resAgentes.json();
      
      if (!rawAgentes.data) throw new Error("Error en api/archivo-excel-agentes");

      const cleanedLlamadas = rawLlamadas.data.map(row => {
        const rowStr = JSON.stringify(row).toUpperCase();
        const ag = getAgentFromRow(row);
        
        let d = "00:00:00";
        let rawTime = row["10"] || row[10] || row['Tiempo de Llamada'] || row['Duracion'];
        if (rawTime) {
           const match = String(rawTime).match(/>\s*([^<]+)\s*</);
           if (match && match[1]) d = match[1].trim(); 
           else d = cleanHTML(rawTime);
        }

        let e = cleanHTML(row.Estado || row["0"] || row[0] || "");

        return {
          fecha: extractDate(row),
          agente: ag,
          duracion: d,
          estado: e,
          fullRowStr: rowStr 
        };
      }).filter(row => row.agente !== 'DESCONOCIDO');

      setDataLlamadas(cleanedLlamadas);
      setDataAgentes(rawAgentes.data);
      const detalleArr = Array.isArray(rawAgentes.detalle) ? rawAgentes.detalle : [];
      setDataDetalle(detalleArr);

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error procesando los reportes. Revisa consola.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomatedData();
    let interval;
    if (autoRefresh) interval = setInterval(fetchAutomatedData, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fechaDesde, fechaHasta]);

  const cruceDiarioMap = new Map();

  dataLlamadas.forEach(ll => {
    if (agentesExcluidos.includes(ll.agente)) return;

    const isRealAtendida = isLlamadaValida(ll.estado, ll.fullRowStr);
    const callSegs = timeToSeconds(ll.duracion);
    const segs = isRealAtendida ? callSegs : 0;

    const key = `${ll.fecha}_${ll.agente}`;

    if (!cruceDiarioMap.has(key)) {
      cruceDiarioMap.set(key, {
        fecha: ll.fecha,
        agenteDisplay: ll.agente,
        modulo: getModulo(ll.agente),
        llamadasTotales: 0, llamadasAtendidas: 0, noAtendidas: 0, habladoSeg: 0, cortas: 0,
        conexSeg: 0, enLineaSeg: 0, enLineaDetalleSeg: 0, gestionLlamadaSeg: 0, almSeg: 0, banoSeg: 0, brkSeg: 0, capSeg: 0, admSeg: 0
      });
    }
    const registro = cruceDiarioMap.get(key);

    registro.llamadasTotales += 1;
    if (isRealAtendida) {
      registro.llamadasAtendidas += 1;
      registro.habladoSeg += segs;
    } else {
      registro.noAtendidas += 1;
    }
    if (callSegs > 0 && callSegs < 30) registro.cortas += 1;
  });

  const extractTimeFromHTML = (htmlString) => {
    if(!htmlString) return 0;
    const str = String(htmlString);
    const matchExacto = str.match(/>\s*([^<]+)\s*</);
    if (matchExacto && matchExacto[1] && /^\d{1,2}:\d{2}/.test(matchExacto[1].trim())) {
         return timeToSeconds(matchExacto[1].trim());
    }
    const fallbackMatch = str.match(/(\d{2}:\d{2}:\d{2})/);
    return fallbackMatch ? timeToSeconds(fallbackMatch[1]) : timeToSeconds(cleanHTML(str));
  };

  dataAgentes.forEach(ra => {
    let rawFecha = ra.Fecha || ra.fecha || fechaDesde;
    let fechaLimpia = fechaDesde;

    if (typeof rawFecha === 'string') {
        fechaLimpia = fechaDesde === fechaHasta ? fechaDesde : (cleanHTML(rawFecha).split(' ')[0] || today);
    }
    
    const stdName = normalizeAgentName(ra.Agente || ra.agente);
    
    if (agentesExcluidos.includes(stdName)) return;

    const keyEncontrada = `${fechaLimpia}_${stdName}`;

    if(!cruceDiarioMap.has(keyEncontrada)) {
       cruceDiarioMap.set(keyEncontrada, {
        fecha: fechaLimpia,
        agenteDisplay: stdName,
        modulo: getModulo(stdName),
        llamadasTotales: 0, llamadasAtendidas: 0, noAtendidas: 0, habladoSeg: 0, cortas: 0,
        conexSeg: 0, enLineaSeg: 0, enLineaDetalleSeg: 0, gestionLlamadaSeg: 0, almSeg: 0, banoSeg: 0, brkSeg: 0, capSeg: 0, admSeg: 0
      });
    }

    const registro = cruceDiarioMap.get(keyEncontrada);

    const rawInicio = ra['Inicio Turno'] || "00:00:00";
    const rawFin = ra['Fin Turno'] || "00:00:00";
    const inicioSeg = extractTimeFromHTML(rawInicio);
    const finSeg = extractTimeFromHTML(rawFin);

    let conexTotal = 0;
    if (finSeg > 0 || inicioSeg > 0) {
      conexTotal = finSeg >= inicioSeg ? (finSeg - inicioSeg) : ((finSeg + 86400) - inicioSeg);
    }
    registro.conexSeg = conexTotal;

    registro.enLineaSeg = extractTimeFromHTML(ra['En Linea'] || ra['En_Linea'] || "00:00:00");
    registro.banoSeg = extractTimeFromHTML(ra['Baño'] || ra['Bano'] || "00:00:00");
    registro.brkSeg = extractTimeFromHTML(ra['Break'] || "00:00:00");
    registro.capSeg = extractTimeFromHTML(ra['Capacitación'] || ra['Capacitacion'] || ra['Training'] || "00:00:00");
    registro.admSeg = extractTimeFromHTML(ra['Administrativo'] || ra['Back Office'] || ra['Reunion'] || ra['Reunión'] || "00:00:00");
  });

  const parseTiempoCelda = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return Math.round(val * 86400);
    if (val instanceof Date) return val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds();
    return timeToSeconds(String(val).replace(/<[^>]*>?/g, '').trim());
  };

  const normalizeEstado = (s) => cleanHTML(String(s || ''))
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim();

  const colacionAcumMap = new Map();
  const enLineaDetAcumMap = new Map();
  const gestionLlamadaAcumMap = new Map();
  dataDetalle.forEach(row => {
    const estado = normalizeEstado(row.Estado || row.estado);
    const isColacion = estado.includes('colacion');
    const isEnLinea = estado.includes('en linea') || estado.includes('en_linea');
    const isGestion = estado.includes('gestion llamada') || estado.includes('gestion_llamada') || estado.includes('gestionllamada');
    if (!isColacion && !isEnLinea && !isGestion) return;

    const tiempoSeg = parseTiempoCelda(row.Tiempo || row.tiempo || row['Duración'] || row['Duracion']);
    if (tiempoSeg <= 0) return;

    const stdName = normalizeAgentName(row.Agente || row.agente || row.Nombre || row.nombre || '');
    if (!stdName || stdName === 'DESCONOCIDO' || agentesExcluidos.includes(stdName)) return;

    let fechaLimpia = fechaDesde;
    if (fechaDesde !== fechaHasta) {
      const rawFecha = row.Fecha || row.fecha || row['Día'] || row['Dia'];
      if (rawFecha) {
        const cleaned = cleanHTML(String(rawFecha));
        const match = cleaned.match(/\d{4}-\d{2}-\d{2}/);
        fechaLimpia = match ? match[0] : (cleaned.split(' ')[0] || fechaDesde);
      }
    }

    const key = `${fechaLimpia}_${stdName}`;
    if (isColacion) colacionAcumMap.set(key, (colacionAcumMap.get(key) || 0) + tiempoSeg);
    if (isEnLinea) enLineaDetAcumMap.set(key, (enLineaDetAcumMap.get(key) || 0) + tiempoSeg);
    if (isGestion) gestionLlamadaAcumMap.set(key, (gestionLlamadaAcumMap.get(key) || 0) + tiempoSeg);

    if (!cruceDiarioMap.has(key)) {
      cruceDiarioMap.set(key, {
        fecha: fechaLimpia,
        agenteDisplay: stdName,
        modulo: getModulo(stdName),
        llamadasTotales: 0, llamadasAtendidas: 0, noAtendidas: 0, habladoSeg: 0, cortas: 0,
        conexSeg: 0, enLineaSeg: 0, enLineaDetalleSeg: 0, gestionLlamadaSeg: 0, almSeg: 0, banoSeg: 0, brkSeg: 0, capSeg: 0, admSeg: 0
      });
    }
  });

  cruceDiarioMap.forEach((reg, key) => {
    reg.almSeg = colacionAcumMap.get(key) || 0;
    reg.enLineaDetalleSeg = enLineaDetAcumMap.get(key) || 0;
    reg.gestionLlamadaSeg = gestionLlamadaAcumMap.get(key) || 0;
  });


  const turnoPlanificadoSegundos = 32400;

  const filasCalculadas = Array.from(cruceDiarioMap.values()).map(fila => {
    let secAcw = Math.max(0, fila.gestionLlamadaSeg - fila.habladoSeg);
    fila.acwSeg = secAcw;

    let divisorProd = fila.conexSeg - fila.almSeg;
    let prod = divisorProd > 0 ? (fila.habladoSeg / divisorProd) * 100 : 0;
    
    let ocup = fila.conexSeg > 0 ? ((fila.habladoSeg + fila.acwSeg) / fila.conexSeg) * 100 : 0;
    let adh = turnoPlanificadoSegundos > 0 ? (fila.conexSeg / turnoPlanificadoSegundos) * 100 : 0;
    let contac = fila.llamadasTotales > 0 ? (fila.llamadasAtendidas / fila.llamadasTotales) * 100 : 0;
    
    let tmo = fila.llamadasAtendidas > 0 ? (fila.habladoSeg / fila.llamadasAtendidas) : 0;
    let pacw = fila.llamadasAtendidas > 0 ? (fila.acwSeg / fila.llamadasAtendidas) : 0;
    let penlinea = fila.llamadasTotales > 0 ? (fila.enLineaSeg / fila.llamadasTotales) : 0;

    return {
      ...fila,
      prod: isNaN(prod) ? 0 : Math.min(prod, 100),
      ocup: isNaN(ocup) ? 0 : Math.min(ocup, 100),
      adh: isNaN(adh) ? 0 : Math.min(adh, 100),
      contac: contac,
      tmo: tmo,
      pacw: pacw,
      penlinea: penlinea
    };
  });

  const ejecutivosDisponibles = Array.from(new Set(filasCalculadas.map(f => f.agenteDisplay))).sort();

  const filasFiltradas = filasCalculadas.filter(f => {
    if (filtroModulo && f.modulo !== filtroModulo) return false;
    if (filtroEjecutivo && f.agenteDisplay !== filtroEjecutivo) return false;
    return true;
  });

  let gConex = 0, gHablado = 0, gAcw = 0, gAlm = 0, gTotales = 0, gAtendidas = 0, gCortas = 0, gEnLinea = 0;

  filasFiltradas.forEach(f => {
    gConex += f.conexSeg;
    gHablado += f.habladoSeg;
    gAcw += f.acwSeg;
    gAlm += f.almSeg;
    gTotales += f.llamadasTotales;
    gAtendidas += f.llamadasAtendidas;
    gCortas += f.cortas;
    gEnLinea += f.enLineaSeg;
  });

  const gPlanificado = filasFiltradas.length > 0 ? filasFiltradas.length * turnoPlanificadoSegundos : 1;
  const rawGProd = (gConex - gAlm) > 0 ? (gHablado / (gConex - gAlm)) * 100 : 0;
  const rawGOcup = gConex > 0 ? ((gHablado + gAcw) / gConex) * 100 : 0;
  const rawGAdh = (gConex / gPlanificado) * 100;

  const gProd = Math.min(rawGProd, 100);
  const gOcup = Math.min(rawGOcup, 100);
  const gAdh = Math.min(rawGAdh, 100);
  
  const gTmo = gAtendidas > 0 ? (gHablado / gAtendidas) : 0;
  const gPacw = gAtendidas > 0 ? (gAcw / gAtendidas) : 0;
  const gPenlinea = gTotales > 0 ? (gEnLinea / gTotales) : 0;
  const gContact = gTotales > 0 ? (gAtendidas / gTotales) * 100 : 0;

  const KpiBox = ({ title, value, metaText, metaSub, accentColor, glow, Icon }) => (
    <div
      className={`bg-slate-900/60 backdrop-blur-sm rounded-xl border-t-2 border-l border-r border-b border-slate-800 px-4 py-3.5 flex flex-col h-[134px] relative overflow-hidden transition-all hover:bg-slate-900/80 hover:scale-[1.02]`}
      style={{ borderTopColor: accentColor, boxShadow: `0 0 18px ${glow}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>{title}</h3>
        {Icon && <Icon className="w-3.5 h-3.5 opacity-70" style={{ color: accentColor }} />}
      </div>
      <p className="text-[26px] font-black text-white tabular-nums leading-none tracking-tight">{value}</p>
      <div className="mt-auto pt-2 border-t border-slate-800/80">
        <p className="text-[10px] font-bold text-slate-300">{metaText}</p>
        <p className="text-[9px] text-slate-500 truncate font-mono uppercase tracking-wider">{metaSub}</p>
      </div>
    </div>
  );

  const modulos = ['BLOQUEO', 'INGRESOS', 'FDS', 'MESA CENTRAL'];
  const coloresModulo = {
    'BLOQUEO': '#3b82f6',
    'INGRESOS': '#10b981',
    'FDS': '#f97316',
    'MESA CENTRAL': '#a855f7'
  };
  const glowsModulo = {
    'BLOQUEO': 'rgba(59, 130, 246, 0.25)',
    'INGRESOS': 'rgba(16, 185, 129, 0.25)',
    'FDS': 'rgba(249, 115, 22, 0.25)',
    'MESA CENTRAL': 'rgba(168, 85, 247, 0.25)'
  };

  const getModuleStats = (modName) => {
    const agentesMod = filasCalculadas.filter(a => a.modulo === modName);
    let mConex=0, mHablado=0, mAcw=0, mAlm=0, mAtendidas=0, mCortas=0;

    agentesMod.forEach(f => {
      mConex+=f.conexSeg; mHablado+=f.habladoSeg; mAcw+=f.acwSeg; mAlm+=f.almSeg; mAtendidas+=f.llamadasAtendidas; mCortas+=f.cortas;
    });

    const mPlanificado = agentesMod.length > 0 ? agentesMod.length * turnoPlanificadoSegundos : 1;
    const mProd = (mConex - mAlm) > 0 ? (mHablado / (mConex - mAlm)) * 100 : 0;
    const mOcup = mConex > 0 ? ((mHablado + mAcw) / mConex) * 100 : 0;
    const mAdh = (mConex / mPlanificado) * 100;
    const mTmo = mAtendidas > 0 ? (mHablado / mAtendidas) : 0;
    const mPacw = mAtendidas > 0 ? (mAcw / mAtendidas) : 0;

    return {
      nombre: modName,
      agentesCount: agentesMod.length,
      prod: Math.min(mProd, 100),
      adh: Math.min(mAdh, 100),
      ocup: Math.min(mOcup, 100),
      tmo: mTmo,
      pacw: mPacw,
      cortas: mCortas
    };
  };

  return (
    <div className="p-4 min-h-screen font-sans">
      {/* TOOLBAR */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md px-5 py-4 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-wide">Dashboard Operacional</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">HLF · Reportería Diaria</p>
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
              {ejecutivosDisponibles.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          {(filtroEjecutivo || filtroModulo) && (
            <button
              onClick={() => { setFiltroEjecutivo(''); setFiltroModulo(''); }}
              className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            >
              Limpiar filtros
            </button>
          )}
          <div
            title="Filas devueltas por la pestaña Reporte Detallado Agentes"
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider border ${dataDetalle.length > 0 ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-amber-500/15 border-amber-500/40 text-amber-300'}`}
          >
            Detalle: {dataDetalle.length}
          </div>
          <button onClick={fetchAutomatedData} disabled={isLoading} className="flex items-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 border border-cyan-500/40 text-cyan-300 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-rose-950/40 text-rose-300 rounded-xl flex items-center gap-2 border border-rose-800/60 text-xs font-medium shadow-[0_0_15px_rgba(244,63,94,0.15)]">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* KPIs GLOBALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8 items-start">
        <KpiBox title="Productividad" value={`${gProd.toFixed(1)}%`} metaText="Meta: ≥ 70%" metaSub="Hablado / Conexión" accentColor="#22d3ee" glow="rgba(34,211,238,0.18)" Icon={Zap} />
        <KpiBox title="Adherencia" value={`${gAdh.toFixed(1)}%`} metaText="Meta: 90% – 105%" metaSub="Conex. / Planificado" accentColor="#10b981" glow="rgba(16,185,129,0.18)" Icon={Target} />
        <KpiBox title="Ocupación" value={`${gOcup.toFixed(1)}%`} metaText="Meta: 95% – 105%" metaSub="(Habl.+ACW) / Conex." accentColor="#f59e0b" glow="rgba(245,158,11,0.18)" Icon={Gauge} />
        <KpiBox title="TMO Global" value={formatSecondsShort(gTmo)} metaText="Meta: < 3 min" metaSub="Hablado / Atendidas" accentColor="#6366f1" glow="rgba(99,102,241,0.18)" Icon={Timer} />
        <KpiBox title="P-ACW" value={formatSecondsShort(gPacw)} metaText="Meta: < 1 min" metaSub="ACW / Atendidas" accentColor="#94a3b8" glow="rgba(148,163,184,0.15)" Icon={Coffee} />
        <KpiBox title="Cortas" value={gCortas} metaText="Informativo" metaSub="Bajo umbral 30s" accentColor="#f43f5e" glow="rgba(244,63,94,0.18)" Icon={AlertTriangle} />
        <KpiBox title="P-Enlínea" value={formatSecondsShort(gPenlinea)} metaText="Estados / Interacciones" metaSub="En Línea / Totales" accentColor="#a855f7" glow="rgba(168,85,247,0.18)" Icon={Radio} />
        <KpiBox title="Contactabilidad" value={`${gContact.toFixed(1)}%`} metaText="Auxiliar" metaSub="Atend. / Totales" accentColor="#0ea5e9" glow="rgba(14,165,233,0.18)" Icon={Phone} />
      </div>

      {/* MÓDULOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {modulos.map(modName => {
          const stats = getModuleStats(modName);
          const color = coloresModulo[modName];
          const glow = glowsModulo[modName];
          const isActive = filtroModulo === modName;
          return (
            <div
              key={modName}
              onClick={() => setFiltroModulo(isActive ? '' : modName)}
              className={`bg-slate-900/60 backdrop-blur-sm rounded-xl border-t-2 border-l border-r border-b overflow-hidden transition-all hover:bg-slate-900/80 hover:scale-[1.01] cursor-pointer ${isActive ? 'border-slate-500 ring-2 ring-offset-2 ring-offset-slate-950' : 'border-slate-800'}`}
              style={{ borderTopColor: color, boxShadow: `0 0 18px ${glow}`, ...(isActive ? { '--tw-ring-color': color } : {}) }}
            >
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: color, color: color }}></span>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Servicio</p>
                    <h3 className="text-sm font-black text-white tracking-tight">{modName}</h3>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700" style={{ color: color }}>
                  {stats.agentesCount} reg
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-800">
                <div className="px-3 py-3 text-center">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Prod</p>
                  <p className="text-sm font-black text-white tabular-nums mt-1">{stats.prod.toFixed(1)}%</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Adh</p>
                  <p className="text-sm font-black text-white tabular-nums mt-1">{stats.adh.toFixed(1)}%</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ocup</p>
                  <p className="text-sm font-black text-white tabular-nums mt-1">{stats.ocup.toFixed(1)}%</p>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800">
                <div className="px-3 py-3 text-center">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">TMO</p>
                  <p className="text-sm font-black text-white tabular-nums mt-1">{formatSecondsShort(stats.tmo)}</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">P-ACW</p>
                  <p className="text-sm font-black text-white tabular-nums mt-1">{formatSecondsShort(stats.pacw)}</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cortas</p>
                  <p className="text-sm font-black text-white tabular-nums mt-1">{stats.cortas}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLA DETALLE */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border-t-2 border-cyan-500 border-l border-r border-b border-slate-800 overflow-hidden mt-8 shadow-[0_0_18px_rgba(6,182,212,0.18)]">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <List className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-cyan-300 tracking-widest uppercase">Detalle Diario</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400">
              {filasFiltradas.length} registros
            </span>
          </div>
        </div>
        <div className="overflow-x-auto scroller">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-slate-950/60 border-b border-slate-800">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Agente</th>
                <th className="px-4 py-3 text-right">Conexión</th>
                <th className="px-4 py-3 text-center">Totales</th>
                <th className="px-4 py-3 text-center">Atend.</th>
                <th className="px-4 py-3 text-center">No Atend.</th>
                <th className="px-4 py-3 text-right">Contac.</th>
                <th className="px-4 py-3 text-center">Cortas</th>
                <th className="px-4 py-3 text-right">TMO</th>
                <th className="px-4 py-3 text-right">Hablado</th>
                <th className="px-4 py-3 text-right">En Línea</th>
                <th className="px-4 py-3 text-right">ACW</th>
                <th className="px-4 py-3 text-right">P-Enlínea</th>
                <th className="px-4 py-3 text-right">P-ACW</th>
                <th className="px-4 py-3 text-right bg-amber-500/10 border-l border-amber-500/30 text-amber-300">CAP</th>
                <th className="px-4 py-3 text-right bg-amber-500/10 text-amber-300">ADM</th>
                <th className="px-4 py-3 text-right bg-amber-500/10 text-amber-300">BRK</th>
                <th className="px-4 py-3 text-right bg-amber-500/10 text-amber-300">ALM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filasFiltradas
                .sort((a, b) => {
                  if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
                  return a.agenteDisplay.localeCompare(b.agenteDisplay);
                })
                .map((ag, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5 text-left text-slate-500 tabular-nums font-mono">{ag.fecha}</td>
                  <td className="px-4 py-2.5 text-left font-bold text-white">{ag.agenteDisplay}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-200">{formatSeconds(ag.conexSeg)}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-slate-300">{ag.llamadasTotales}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums font-bold text-emerald-400">{ag.llamadasAtendidas}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums font-bold text-red-500">{ag.noAtendidas}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-200">{ag.contac.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-rose-400">{ag.cortas}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-200">{formatSecondsShort(ag.tmo)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{formatSeconds(ag.habladoSeg)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{formatSeconds(ag.enLineaSeg)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{formatSeconds(ag.acwSeg)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{formatSecondsShort(ag.penlinea)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{formatSecondsShort(ag.pacw)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-300/80 bg-amber-500/5 border-l border-amber-500/20">{formatSeconds(ag.capSeg)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-300/80 bg-amber-500/5">{formatSeconds(ag.admSeg)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-300/80 bg-amber-500/5">{formatSeconds(ag.brkSeg)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-300/80 bg-amber-500/5">{formatSeconds(ag.almSeg)}</td>
                </tr>
              ))}
              {filasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="18" className="px-4 py-12 text-center text-slate-500 text-xs uppercase tracking-widest font-bold">
                    Sin datos disponibles para el rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardGeneral;
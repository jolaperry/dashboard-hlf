// src/utils/dataProcessor.js
import { timeToSec, cleanName, normalizeDate, extractDateAndTime, isGlobalNoAt, getVal } from './helpers';

const AUX_SERVICES_MAP = {
  "Bloqueo": ["Lorena Rodriguez", "Lorena", "Andreina Villalon", "Andreina", "Oscar Hidalgo", "Oscar"],
  "Ingresos": ["Carla Garay", "Carla", "Miriam Bruges", "Miriam", "Cristobal Fernandez", "Cristobal", "Jorge Yanez", "Jorge"],
  "FDS": ["Joanna Rojas", "Joanna", "Saymar Paez", "Saymar"]
};

const getAuxService = (name) => {
  const clean = cleanName(name);
  for (const [srv, members] of Object.entries(AUX_SERVICES_MAP)) {
    if (members.some(m => cleanName(m).includes(clean) || clean.includes(cleanName(m)))) return srv;
  }
  return "Mesa Central";
};

export const processData = (detailRows, stateRows, auxRows) => {
  const groups = {};
  const groupedAux = {};

  if (auxRows && auxRows.length > 0) {
    auxRows.forEach(row => {
      const agente = getVal(row, ['agente']);
      const fechaRaw = getVal(row, ['fecha']);
      
      if (!agente || !fechaRaw) return;

      const dt = extractDateAndTime(fechaRaw);
      const name = cleanName(agente);
      const key = `${name}|${dt.date}`;

      if (!groupedAux[key]) groupedAux[key] = [];
      
      groupedAux[key].push({
        estado: getVal(row, ['estado', 'estado_de']) || "",
        tiempo_de_llamada: getVal(row, ['tiempo_de_llamada', 'tiempo de llamada']) || "", 
        tipificacion: getVal(row, ['tipificacion']) || "",
        sentido: getVal(row, ['sentido']) || ""
      });
    });
  }

  if (detailRows && detailRows.length > 0) {
    detailRows.forEach(row => {
      const a = getVal(row, ['agente', 'nombre']);
      const f = getVal(row, ['fecha', 'dia']);
      if (!a) return;

      const name = cleanName(a);
      const date = normalizeDate(f);
      const key = `${name}|${date}`;

      if (!groups[key]) groups[key] = { agent: name, date: date, regs: [] };
      
      groups[key].regs.push({
        estado: String(getVal(row, ['estado']) || "").toLowerCase(),
        inicio: getVal(row, ['inicio']),
        tiempo: getVal(row, ['tiempo', 'duracion']),
        fin: getVal(row, ['fin'])
      });
    });
  }

  const globalData = Object.values(groups).map(g => {
    const stats = {
      agente: g.agent,
      fecha: g.date,
      servicio: getAuxService(g.agent),
      t_hablado_tel_orig: 0,
      t_acw_orig: 0,
      t_en_linea: 0,
      t_almuerzo: 0,
      t_break: 0,
      t_bano: 0,
      t_idle: 0,
      t_admin: 0,
      t_cap: 0,
      c_calls_orig: 0,
      t_conectado_real: 0,
      c_cortas: 0
    };

    let firstLogin = null;
    let lastLogout = null;

    g.regs.forEach(r => {
      const s = r.estado;
      const dur = timeToSec(r.tiempo);
      const start = timeToSec(r.inicio);

      if (s.includes('gestion llamada')) { stats.t_hablado_tel_orig += dur; stats.c_calls_orig++; }
      else if (s.includes('acw') || s.includes('trabajo administrativo') || s.includes('post llamada') || s.includes('administrativo')) stats.t_acw_orig += dur;
      else if (s.includes('en linea') || s.includes('en línea')) stats.t_en_linea += dur;
      else if (s.includes('disponible') || s.includes('espera') || s.includes('listo') || s.includes('waiting') || s.includes('idle')) stats.t_idle += dur;
      else if (s.includes('almuerzo') || s.includes('colacion')) stats.t_almuerzo += dur;
      else if (s.includes('break')) stats.t_break += dur;
      else if (s.includes('bano') || s.includes('baño')) stats.t_bano += dur;
      else if (s.includes('capacita') || s.includes('training')) stats.t_cap += dur;
      else if (s.includes('admin') || s.includes('back office')) stats.t_admin += dur;

      if (s === 'conectado') {
        if (firstLogin === null || start < firstLogin) firstLogin = start;
      }
      if (s.includes('cierre') || s.includes('sesion')) {
        if (lastLogout === null || start > lastLogout) lastLogout = start;
      }
    });

    if (firstLogin !== null && lastLogout !== null && lastLogout > firstLogin) {
      stats.t_conectado_real = lastLogout - firstLogin;
    } else {
      stats.t_conectado_real = stats.t_hablado_tel_orig + stats.t_acw_orig + stats.t_en_linea + stats.t_break + stats.t_almuerzo + stats.t_bano + stats.t_idle + stats.t_cap + stats.t_admin;
    }

    const key = `${g.agent}|${g.date}`;
    const auxLogs = groupedAux[key] || [];
    
    let atend_c = 0;
    let no_atend_c = 0;
    let new_t_hab = 0;
    let cortas_c = 0;

    if (auxLogs.length > 0) {
      auxLogs.forEach(r => {
        const tLla = timeToSec(r.tiempo_de_llamada);
        const isNoAt = isGlobalNoAt(r.estado, r.tipificacion);
        const isAt = !isNoAt && (String(r.estado).toLowerCase().includes('atendida') || String(r.estado).toLowerCase().includes('conectad') || String(r.estado).toLowerCase() === 'ok' || String(r.estado).toLowerCase() === '' || tLla > 0);
        
        if (isAt) {
          atend_c++;
          new_t_hab += tLla;
          if (tLla < 20) cortas_c++; 
        } else {
          no_atend_c++;
        }
      });

      stats.c_calls = atend_c;
      stats.c_no_atendidas = no_atend_c;
      stats.t_hablado_tel = new_t_hab;
      stats.t_acw = stats.t_acw_orig; 
      stats.c_cortas = cortas_c;
    } else {
      stats.c_calls = stats.c_calls_orig;
      stats.c_no_atendidas = 0;
      stats.t_hablado_tel = stats.t_hablado_tel_orig;
      stats.t_acw = stats.t_acw_orig;
      stats.c_cortas = 0;
    }

    return stats;
  });

  return globalData;
};
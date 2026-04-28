// src/utils/helpers.js
export const pad = (n) => n?.toString().padStart(2, '0') || '00';

export const timeToSec = (val) => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === 'number') return Math.round(val * 86400);
  const s = String(val).trim();
  if (s.includes(':')) {
    const p = (s.split(' ')[1] || s).split(':').map(Number);
    return (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
  }
  return 0;
};

export const secToTime = (s, short = false) => {
  if (!s || isNaN(s) || s < 0) return short ? "00:00" : "00:00:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return short ? `${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

export const cleanName = (n) => {
  return String(n || "")
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
};

// Conversor robusto de fechas (Soporta fechas numéricas de Excel)
export const normalizeDate = (val) => {
  if (val === undefined || val === null || val === "") return "";
  if (val instanceof Date) { if (!isNaN(val)) return val.toISOString().split('T')[0]; return ""; }
  
  if (typeof val === 'number') {
    if (val > 20000 && val < 300000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    return "";
  }

  let s = String(val).trim();
  if (s.includes(' ')) s = s.split(' ')[0];
  if (s.includes('/') || s.includes('-')) {
    let sep = s.includes('/') ? '/' : '-';
    const p = s.split(sep);
    if (p.length === 3) {
      if (p[0].length === 4) return `${p[0]}-${pad(p[1])}-${pad(p[2])}`;
      if (p[2].length === 4) return `${p[2]}-${pad(p[1])}-${pad(p[0])}`;
    }
  }
  if (s.includes('T')) return s.split('T')[0];
  return s;
};

export const extractDateAndTime = (val) => {
  if (val === undefined || val === null || val === "") return { date: '', time: '' };
  
  if (typeof val === 'number') {
    if (val > 20000 && val < 300000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(d)) return { date: d.toISOString().split('T')[0], time: d.toISOString().split('T')[1].substr(0, 8) };
    }
    return { date: '', time: '' };
  }

  let s = String(val).trim();
  let datePart = s, timePart = '';
  if (s.includes(' ')) {
    const parts = s.split(' ');
    datePart = parts[0];
    timePart = parts[1];
  } else if (s.includes('T')) {
    const parts = s.split('T');
    datePart = parts[0];
    timePart = parts[1].replace('Z', '');
  }
  return { date: normalizeDate(datePart), time: timePart.substr(0, 8) };
};

export const isGlobalNoAt = (estado, tipificacion) => {
  const tipNorm = String(tipificacion || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const st = String(estado).toLowerCase().trim();
  const isForcedNoAt = tipNorm.includes('no contesta') || tipNorm.includes('no existe') || tipNorm.includes('buzon de voz');
  return isForcedNoAt || st.includes('no-atendida') || st.includes('abandonada') || st.includes('falla') || st === 'no atendida';
};

// NUEVO: Buscador inteligente de columnas
export const getVal = (row, keywords) => {
  const keys = Object.keys(row);
  const k = keys.find(key => 
    keywords.some(kw => key.toLowerCase() === kw.toLowerCase() || key.toLowerCase().includes(kw.toLowerCase()))
  );
  return k ? row[k] : undefined;
};
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, List, Download, Lock, Unlock } from 'lucide-react';

const DashboardGeneral = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phpsessid, setPhpsessid] = useState('qjtqc4o6k4q63q4gdue9317fl9');
  
  const today = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(today);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const contrasenaSecreta = 'admin2026';

  const handleUnlock = () => {
    if (passwordInput === contrasenaSecreta) {
      setIsUnlocked(true);
      setPasswordInput('');
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const cleanHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>?/gm, '').trim();
  };

  const getModulo = (agenteNombre) => {
    if (!agenteNombre) return 'Otros';
    const a = agenteNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const bloqueo = ['villalon', 'hidalgo', 'rodriguez salazar', 'lorena rodriguez'];
    const ingresos = ['bruges', 'fernandez azares', 'cristobal', 'garay', 'yanez', 'nunez baeza', 'paz nunez'];
    const fds = ['paez', 'saymar', 'rojas rejas', 'joanna rojas', 'joanna.rojas'];
    const mesa = ['cea', 'ossandon', 'herrera merida', 'johanna herrera', 'agudelo', 'baron', 'yessenia', 'herrera barriga', 'paola herrera', 'manzanilla', 'farias'];

    if (bloqueo.some(k => a.includes(k))) return 'BLOQUEO';
    if (ingresos.some(k => a.includes(k))) return 'INGRESOS';
    if (fds.some(k => a.includes(k))) return 'FDS';
    if (mesa.some(k => a.includes(k))) return 'MESA CENTRAL';

    return 'OTROS';
  };

  const fetchAutomatedData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/llamadas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaDesde: fechaDesde, fechaHasta: fechaHasta, phpsessid: phpsessid })
      });

      const rawData = await response.json();
      if (!rawData.data) throw new Error("Sesión inválida");

      const cleaned = rawData.data
        .map(row => {
          const agenteLimpio = cleanHTML(row[5]);
          return {
            fecha: cleanHTML(row[2]),
            servicio: cleanHTML(row[4]),
            modulo: getModulo(agenteLimpio),
            agente: agenteLimpio,
            duracion: cleanHTML(row[9]),
            estado: cleanHTML(row.Estado)
          };
        })
        .filter(row => {
          const ag = row.agente.toUpperCase();
          return !ag.includes('IVR') && !ag.includes('IA');
        });

      setData(cleaned);
      setError(null);
    } catch (err) {
      setError("Error de conexión o sesión expirada.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomatedData();
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAutomatedData();
      }, 300000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, phpsessid, fechaDesde, fechaHasta]);

  const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  const formatSeconds = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const agentesMapAcumulado = new Map();
  const agentesMapDiario = new Map();

  data.forEach(ll => {
    const fechaCorta = ll.fecha.split(' ')[0];
    const keyDiario = `${fechaCorta}_${ll.agente}`;
    const isAtendida = ll.estado === 'Atendida';
    const segs = isAtendida ? timeToSeconds(ll.duracion) : 0;
    const isCorta = isAtendida && segs < 15;

    if (!agentesMapAcumulado.has(ll.agente)) {
      agentesMapAcumulado.set(ll.agente, {
        nombre: ll.agente,
        modulo: ll.modulo,
        total: 0,
        atendidas: 0,
        habladoSeg: 0,
        cortas: 0
      });
    }
    const agAcum = agentesMapAcumulado.get(ll.agente);
    agAcum.total += 1;
    if (isAtendida) {
      agAcum.atendidas += 1;
      agAcum.habladoSeg += segs;
      if (isCorta) agAcum.cortas += 1;
    }

    if (!agentesMapDiario.has(keyDiario)) {
      agentesMapDiario.set(keyDiario, {
        fecha: fechaCorta,
        nombre: ll.agente,
        modulo: ll.modulo,
        total: 0,
        atendidas: 0,
        habladoSeg: 0,
        cortas: 0
      });
    }
    const agDiario = agentesMapDiario.get(keyDiario);
    agDiario.total += 1;
    if (isAtendida) {
      agDiario.atendidas += 1;
      agDiario.habladoSeg += segs;
      if (isCorta) agDiario.cortas += 1;
    }
  });

  const formatearAgentes = (mapa) => Array.from(mapa.values()).map(ag => ({
    ...ag,
    tmo: ag.atendidas > 0 ? ag.habladoSeg / ag.atendidas : 0,
    contactabilidad: ag.total > 0 ? (ag.atendidas / ag.total) * 100 : 0,
    prod: 0, 
    adh: 0,
    ocup: 0,
    pacw: 0,
    penlinea: 0
  }));

  const agentesListAcumulado = formatearAgentes(agentesMapAcumulado);
  const agentesListDiario = formatearAgentes(agentesMapDiario);

  const totalGlobal = data.length;
  const atendidasGlobal = data.filter(d => d.estado === 'Atendida').length;
  const habladoSegGlobal = data.filter(d => d.estado === 'Atendida').reduce((acc, curr) => acc + timeToSeconds(curr.duracion), 0);
  const tmoGlobal = atendidasGlobal > 0 ? habladoSegGlobal / atendidasGlobal : 0;
  const cortasGlobal = agentesListAcumulado.reduce((acc, curr) => acc + curr.cortas, 0);
  const contactGlobal = totalGlobal > 0 ? (atendidasGlobal / totalGlobal) * 100 : 0;

  const KpiBox = ({ title, value, metaText, metaSub, borderColor, textColor }) => (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 p-4 flex flex-col justify-between h-32`} style={{ borderColor: borderColor }}>
      <div>
        <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-1`} style={{ color: borderColor }}>{title}</h3>
        <p className={`text-2xl font-black`} style={{ color: textColor || '#1e293b' }}>{value}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500">{metaText}</p>
        <p className="text-[9px] text-slate-400">{metaSub}</p>
      </div>
    </div>
  );

  const RankingList = ({ title, dataList, valueKey, formatKey, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-auto mt-2">
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <h4 className="text-[10px] font-bold uppercase text-slate-600">{title}</h4>
      </div>
      <div className="p-2 flex-1">
        {dataList.sort((a, b) => b[valueKey] - a[valueKey]).map((item, idx) => (
          <div key={idx} className="flex justify-between items-center py-2 px-2 hover:bg-slate-50 rounded text-xs border-b border-slate-50 last:border-0">
            <span className="text-slate-600 truncate w-32">
              <span className="text-slate-400 mr-2">{idx + 1}.</span> 
              {item.nombre.split(' ').slice(0,2).join(' ')}
            </span>
            <span className="font-bold" style={{ color: color }}>
              {formatKey === 'time' ? formatSeconds(item[valueKey]) : 
               formatKey === 'pct' ? `${item[valueKey].toFixed(1)}%` : 
               item[valueKey]}
            </span>
          </div>
        ))}
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

  const getModuleStats = (modName) => {
    const agentesMod = agentesListAcumulado.filter(a => a.modulo === modName);
    const atendidas = agentesMod.reduce((acc, curr) => acc + curr.atendidas, 0);
    const habladoSeg = agentesMod.reduce((acc, curr) => acc + curr.habladoSeg, 0);
    const tmo = atendidas > 0 ? habladoSeg / atendidas : 0;
    
    return {
      nombre: modName,
      agentesCount: agentesMod.length,
      prod: 0,
      adh: 0,
      ocup: 0,
      tmo: tmo,
      pacw: 0,
      feed: 0
    };
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex gap-4 items-end">
          
          {isUnlocked ? (
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">SESIÓN (PHPSESSID)</span>
              <div className="flex items-center gap-2">
                <input type="text" value={phpsessid} onChange={(e) => setPhpsessid(e.target.value)} className="border border-slate-200 p-1.5 rounded text-xs w-48 outline-none focus:border-blue-400" />
                <button onClick={() => setIsUnlocked(false)} className="text-slate-400 hover:text-slate-600" title="Bloquear configuración">
                  <Unlock className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">DESBLOQUEAR SESIÓN</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Lock className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    placeholder="Contraseña" 
                    value={passwordInput} 
                    onChange={(e) => setPasswordInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    className="border border-slate-200 p-1.5 pl-7 rounded text-xs w-32 outline-none focus:border-blue-400" 
                  />
                </div>
                <button onClick={handleUnlock} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                  Ok
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">FECHA DESDE</span>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">FECHA HASTA</span>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-blue-400" />
          </div>
        </div>
        <button onClick={fetchAutomatedData} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-sm">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Sincronizar con HLF
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-600 rounded flex items-center gap-2 border-l-4 border-red-500 text-xs font-bold">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8 items-start">
        <div>
          <KpiBox title="PRODUCTIVIDAD" value="0.0%" metaText="Meta: >= 70%" metaSub="Hablado / Conexión" borderColor="#3b82f6" textColor="#1e40af" />
          <RankingList title="PROD" dataList={agentesListAcumulado} valueKey="prod" formatKey="pct" color="#3b82f6" />
        </div>
        <div>
          <KpiBox title="ADHERENCIA" value="0.0%" metaText="Meta: 90% - 105%" metaSub="Conex. / Planificado" borderColor="#10b981" textColor="#047857" />
          <RankingList title="ADH" dataList={agentesListAcumulado} valueKey="adh" formatKey="pct" color="#10b981" />
        </div>
        <div>
          <KpiBox title="OCUPACIÓN" value="0.0%" metaText="Meta: 95% - 105%" metaSub="(Habl.+ACW)/Conex." borderColor="#f97316" textColor="#c2410c" />
          <RankingList title="OCUP" dataList={agentesListAcumulado} valueKey="ocup" formatKey="pct" color="#f97316" />
        </div>
        <div>
          <KpiBox title="TMO GLOBAL" value={formatSeconds(tmoGlobal)} metaText="Meta: < 3 min" metaSub="Hablado / Atendidas" borderColor="#6366f1" textColor="#3730a3" />
          <RankingList title="TMO" dataList={agentesListAcumulado} valueKey="tmo" formatKey="time" color="#6366f1" />
        </div>
        <div>
          <KpiBox title="P-ACW (AVG)" value="00:00" metaText="Meta: < 1 min" metaSub="ACW Total / Atendidas" borderColor="#64748b" textColor="#334155" />
          <RankingList title="P-ACW" dataList={agentesListAcumulado} valueKey="pacw" formatKey="time" color="#64748b" />
        </div>
        <div>
          <KpiBox title="CORTAS" value={cortasGlobal} metaText="Informativo" metaSub="Bajo umbral" borderColor="#ef4444" textColor="#b91c1c" />
          <RankingList title="CORTAS" dataList={agentesListAcumulado} valueKey="cortas" formatKey="num" color="#ef4444" />
        </div>
        <div>
          <KpiBox title="P-ENLINEA (AVG)" value="00:00" metaText="Estados / Interacciones" metaSub="En Linea / Totales" borderColor="#d946ef" textColor="#86198f" />
          <RankingList title="P-ENLINEA" dataList={agentesListAcumulado} valueKey="penlinea" formatKey="time" color="#d946ef" />
        </div>
        <div>
          <KpiBox title="CONTACTABILIDAD" value={`${contactGlobal.toFixed(1)}%`} metaText="Auxiliar" metaSub="Atend./Totales" borderColor="#0ea5e9" textColor="#0369a1" />
          <RankingList title="CONTACT" dataList={agentesListAcumulado} valueKey="contactabilidad" formatKey="pct" color="#0ea5e9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {modulos.map(modName => {
          const stats = getModuleStats(modName);
          const color = coloresModulo[modName];
          return (
            <div key={modName} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col" style={{ borderLeftWidth: '4px', borderLeftColor: color }}>
              <div className="p-4 border-b border-slate-50 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">SERVICIO</p>
                  <h3 className="text-lg font-black text-slate-800">{modName}</h3>
                </div>
                <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: `${color}20`, color: color }}>
                  {stats.agentesCount} ag
                </div>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <div className="border border-slate-100 rounded flex flex-col items-center justify-center py-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Prod</span>
                  <span className="text-sm font-bold text-blue-600">{stats.prod}%</span>
                </div>
                <div className="border border-slate-100 rounded flex flex-col items-center justify-center py-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Adh</span>
                  <span className="text-sm font-bold text-teal-500">{stats.adh}%</span>
                </div>
                <div className="border border-slate-100 rounded flex flex-col items-center justify-center py-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Ocup</span>
                  <span className="text-sm font-bold text-orange-500">{stats.ocup}%</span>
                </div>
                <div className="border border-slate-100 rounded flex flex-col items-center justify-center py-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">TMO</span>
                  <span className="text-sm font-bold text-indigo-600">{formatSeconds(stats.tmo)}</span>
                </div>
                <div className="border border-slate-100 rounded flex flex-col items-center justify-center py-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">P-ACW</span>
                  <span className="text-sm font-bold text-slate-700">{formatSeconds(stats.pacw)}</span>
                </div>
                <div className="border border-slate-100 rounded flex flex-col items-center justify-center py-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Feed</span>
                  <span className="text-sm font-bold text-purple-600">{stats.feed}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-700 font-bold uppercase text-sm tracking-wider">
            <List className="w-5 h-5" />
            Detalle Principal (Diario)
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white border border-slate-200 px-3 py-1 rounded text-xs font-bold text-slate-600">
              {agentesListDiario.length} reg
            </span>
            <button className="flex items-center gap-1 text-teal-600 font-bold text-sm hover:text-teal-700 transition-colors">
              Descargar <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 border-r border-slate-100">Fecha</th>
                <th className="p-3 border-r border-slate-100">Agente</th>
                <th className="p-3 border-r border-slate-100">Servicio</th>
                <th className="p-3 border-r border-slate-100">Turno</th>
                <th className="p-3 border-r border-slate-100">Login Real</th>
                <th className="p-3 border-r border-slate-100">Conex.</th>
                <th className="p-3 border-r border-slate-100">Atraso</th>
                <th className="p-3 border-r border-slate-100">Desc.</th>
                <th className="p-3 border-r border-slate-100">Totales</th>
                <th className="p-3 border-r border-slate-100">Atend</th>
                <th className="p-3 border-r border-slate-100">No Atend</th>
                <th className="p-3 border-r border-slate-100">Contac</th>
                <th className="p-3 border-r border-slate-100">Cortas</th>
                <th className="p-3 border-r border-slate-100">TMO</th>
                <th className="p-3 border-r border-slate-100">Hablado</th>
                <th className="p-3 border-r border-slate-100">En Línea</th>
                <th className="p-3 border-r border-slate-100">ACW</th>
                <th className="p-3 border-r border-slate-100">P-Enlinea</th>
                <th className="p-3 border-r border-slate-100">P-ACW</th>
                <th className="p-3 bg-red-50 border-r border-white text-center">CAP</th>
                <th className="p-3 bg-red-100 border-r border-white text-center">ADM</th>
                <th className="p-3 bg-red-200 border-r border-white text-center">BÑ</th>
                <th className="p-3 bg-orange-100 border-r border-white text-center">BRK</th>
                <th className="p-3 bg-orange-50 border-r border-slate-100 text-center">ALM</th>
                <th className="p-3 border-r border-slate-100">Prod</th>
                <th className="p-3 border-r border-slate-100">Adh</th>
                <th className="p-3">Ocup</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-medium text-slate-600 divide-y divide-slate-100">
              {agentesListDiario
                .sort((a, b) => {
                  if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
                  return a.nombre.localeCompare(b.nombre);
                })
                .map((ag, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 border-r border-slate-100 text-slate-500 font-bold">
                    {ag.fecha}
                  </td>
                  <td className="p-3 border-r border-slate-100 font-bold text-blue-600 whitespace-nowrap">{ag.nombre}</td>
                  <td className="p-3 border-r border-slate-100 text-slate-500">{ag.modulo}</td>
                  <td className="p-3 border-r border-slate-100 text-slate-400">08:00:00 - 18:00:00</td>
                  <td className="p-3 border-r border-slate-100 text-slate-400">08:00:00 - 18:00:00</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-blue-800">09:00:00</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-red-500 bg-red-50">-</td>
                  <td className="p-3 border-r border-slate-100 text-slate-400">-</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-slate-700 text-center">{ag.total}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-green-600 text-center">{ag.atendidas}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-orange-500 text-center">{ag.total - ag.atendidas}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-blue-500 text-center">{ag.contactabilidad.toFixed(1)}%</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-red-400 text-center">{ag.cortas}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-blue-700 text-center">{formatSeconds(ag.tmo)}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-green-500 text-center">{formatSeconds(ag.habladoSeg)}</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-purple-600 text-center">00:00:00</td>
                  <td className="p-3 border-r border-slate-100 text-slate-500 text-center">00:00:00</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-purple-600 text-center">00:00</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-red-500 text-center">00:00</td>
                  <td className="p-3 bg-red-50/50 border-r border-white text-slate-500 text-center">00:00:00</td>
                  <td className="p-3 bg-red-100/50 border-r border-white text-slate-500 text-center">00:00:00</td>
                  <td className="p-3 bg-red-200/50 border-r border-white text-slate-500 text-center">00:00:00</td>
                  <td className="p-3 bg-orange-100/50 border-r border-white text-slate-500 text-center">00:00:00</td>
                  <td className="p-3 bg-orange-50/50 border-r border-slate-100 text-slate-500 text-center">00:00:00</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-red-600 text-center">0%</td>
                  <td className="p-3 border-r border-slate-100 font-bold text-teal-600 text-center">0%</td>
                  <td className="p-3 font-bold text-red-600 text-center">0%</td>
                </tr>
              ))}
              {agentesListDiario.length === 0 && (
                <tr>
                  <td colSpan="27" className="p-6 text-center text-slate-400 italic">No hay datos para mostrar</td>
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
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Calendar, MessageCircle, PhoneIncoming, Lock, Save, Loader2, RefreshCw } from 'lucide-react';

const EditableCell = memo(({ value, onChange, isEditable, className }) => {
  if (!isEditable) return <span className={className}>{value}</span>;

  return (
    <input
      className={`w-full bg-slate-800 px-2 py-1 border border-slate-700 rounded-md outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-slate-100 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  );
});

const TableSection = memo(({ title, icon: Icon, accentColor, glow, tableData, type, isEditable, onUpdate }) => (
  <div
    className="bg-slate-900/60 backdrop-blur-sm rounded-xl border-t-2 border-l border-r border-b border-slate-800 overflow-hidden transition-all"
    style={{ borderTopColor: accentColor, boxShadow: `0 0 18px ${glow}` }}
  >
    <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/80">
      <div
        className="p-1.5 rounded-md border"
        style={{ backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55`, color: accentColor }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: accentColor }}>{title}</h2>
      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700" style={{ color: accentColor }}>
        {tableData.length} reg
      </span>
    </div>
    <div className="overflow-x-auto scroller">
      <table className="w-full text-[11px]">
        <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-widest border-b border-slate-800">
          <tr className="text-[10px] font-bold">
            <th className="px-4 py-3 w-28 text-left">Fecha</th>
            <th className="px-4 py-3 text-left">Agente Responsable</th>
            <th className="px-4 py-3 text-left">Reemplazo / Obs.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {tableData.map((row, i) => (
            <tr key={`${type}-${i}`} className="hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-2">
                <EditableCell
                  isEditable={isEditable}
                  value={row.fecha}
                  onChange={(val) => onUpdate(type, i, 'fecha', val)}
                  className="font-mono text-slate-400 tabular-nums"
                />
              </td>
              <td className="px-4 py-2">
                <EditableCell
                  isEditable={isEditable}
                  value={row.agente}
                  onChange={(val) => onUpdate(type, i, 'agente', val)}
                  className="font-bold text-white"
                />
              </td>
              <td className="px-4 py-2">
                <EditableCell
                  isEditable={isEditable}
                  value={row.reemplazo}
                  onChange={(val) => onUpdate(type, i, 'reemplazo', val)}
                  className="text-amber-300 font-medium"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
));

const Horarios = () => {
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ whatsapp: [], callback: [] });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchHorarios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/horarios`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchHorarios(); }, [fetchHorarios]);

  const updateCell = useCallback((type, index, field, value) => {
    setData(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const handleSave = async () => {
    const pass = prompt("Contraseña de sincronización:");
    if (!pass) return;

    try {
      const response = await fetch(`${API_URL}/api/horarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass, data: data })
      });

      if (response.ok) {
        alert("✅ Sincronizado correctamente");
        setIsEditable(false);
      } else {
        alert("❌ Contraseña incorrecta");
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleGenerateMonth = async () => {
    const pass = prompt("Contraseña de administrador para generar mes:");
    if (!pass) return;

    const mesStr = prompt("Ingresa el número del mes a generar (ej: 5 para Mayo):", "5");
    if (!mesStr) return;

    const anioStr = prompt("Ingresa el año:", new Date().getFullYear().toString());
    if (!anioStr) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/horarios/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            password: pass,
            mes: parseInt(mesStr),
            año: parseInt(anioStr)
        })
      });

      if (response.ok) {
        const newData = await response.json();
        setData(newData);
        alert("✅ Mes generado equitativamente con éxito");
      } else {
        alert("❌ Contraseña incorrecta o error de servidor");
      }
    } catch (error) {
      alert("❌ Error de conexión al generar");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="animate-spin text-cyan-400 w-8 h-8 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
    </div>
  );

  return (
    <div className="p-4 min-h-screen font-sans">
      <div className="mb-6 flex flex-wrap gap-3 justify-between items-center bg-slate-900/80 backdrop-blur-md px-5 py-4 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <h1 className="text-base font-black text-white tracking-wide">Planificación Mensual</h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">WhatsApp & Callback</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateMonth}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:border-cyan-500/50 hover:text-cyan-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Auto-generar mes
          </button>

          {!isEditable ? (
            <button
              onClick={() => setIsEditable(true)}
              className="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:border-amber-500/50 hover:text-amber-300 transition-all"
            >
              <Lock className="w-3.5 h-3.5" /> Modo edición
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-cyan-500/30 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)]"
            >
              <Save className="w-3.5 h-3.5" /> Guardar cambios
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableSection
          title="WhatsApp"
          icon={MessageCircle}
          accentColor="#10b981"
          glow="rgba(16,185,129,0.22)"
          tableData={data.whatsapp}
          type="whatsapp"
          isEditable={isEditable}
          onUpdate={updateCell}
        />
        <TableSection
          title="Callback"
          icon={PhoneIncoming}
          accentColor="#6366f1"
          glow="rgba(99,102,241,0.22)"
          tableData={data.callback}
          type="callback"
          isEditable={isEditable}
          onUpdate={updateCell}
        />
      </div>
    </div>
  );
};

export default Horarios;

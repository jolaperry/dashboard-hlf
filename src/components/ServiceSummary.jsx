// src/components/ServiceSummary.jsx
import { useAppStore } from '../store/useAppStore';
import { secToTime } from '../utils/helpers';
import { Users } from 'lucide-react';

export default function ServiceSummary() {
  const filteredData = useAppStore((state) => state.filteredData);
  const setFilter = useAppStore((state) => state.setFilter);

  const services = ["Bloqueo", "Ingresos", "FDS", "Mesa Central"];
  
  // Mapa de colores seguros de Tailwind
  const colorsMap = { 
    "Bloqueo": "blue", 
    "Ingresos": "teal", 
    "FDS": "orange", 
    "Mesa Central": "indigo" 
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {services.map(sName => {
        // Extraemos solo el equipo de este servicio
        const team = filteredData.filter(d => d.servicio === sName);
        if (team.length === 0) return null; // Si no hay datos, no dibujamos la tarjeta

        // Sumamos las métricas
        let h = 0, con = 0, acw = 0, calls = 0, h_tel = 0;
        team.forEach(d => {
          h += d.t_hablado || 0; 
          h_tel += d.t_hablado_tel || 0; 
          con += d.t_conectado_real || 0; 
          acw += d.t_acw || 0; 
          calls += d.c_calls || 0;
        });

        const prod = con ? (h / con) * 100 : 0;
        const occ = con ? ((h + acw) / con) * 100 : 0;
        const tmo = calls ? h_tel / calls : 0;
        const c = colorsMap[sName] || "slate";

        return (
          <div 
            key={sName}
            onClick={() => setFilter('service', sName)}
            className={`bg-white rounded-2xl border border-${c}-100 shadow-sm p-5 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:ring-2 hover:ring-${c}-300 relative overflow-hidden group`}
            title={`Filtrar por ${sName}`}
          >
            {/* Barra lateral decorativa */}
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-${c}-500 opacity-80 group-hover:opacity-100`}></div>
            
            <div className="flex justify-between items-start mb-4 pl-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo</p>
                <h3 className={`text-lg font-bold text-${c}-700 tracking-tight leading-none mt-1`}>{sName}</h3>
              </div>
              <div className={`bg-${c}-50 text-${c}-600 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-${c}-100`}>
                <Users size={12} /> {new Set(team.map(d => d.agente)).size} ag
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs pl-2">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold mb-0.5">PROD</p>
                <p className="font-bold text-slate-700">{prod.toFixed(0)}%</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold mb-0.5">OCUP</p>
                <p className="font-bold text-slate-700">{occ.toFixed(0)}%</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold mb-0.5">TMO</p>
                <p className="font-bold text-slate-700">{secToTime(tmo, true)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
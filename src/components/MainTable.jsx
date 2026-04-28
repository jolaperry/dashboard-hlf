// src/components/MainTable.jsx
import { useAppStore } from '../store/useAppStore';
import { secToTime } from '../utils/helpers';

export default function MainTable() {
  const filteredData = useAppStore((state) => state.filteredData);

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden flex flex-col w-full">
      
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
          Detalle Extendido por Ejecutivo
        </h3>
        <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
          {filteredData.length} registros
        </span>
      </div>

      <div className="overflow-x-auto scroller w-full max-h-[500px]">
        <table className="w-full text-sm text-left border-collapse min-w-[2000px]">
          <thead className="text-[10px] text-slate-400 uppercase bg-white sticky top-0 z-10 shadow-sm font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Agente</th>
              <th className="px-4 py-3 text-center">Servicio</th>
              <th className="px-4 py-3 text-right">Conexión</th>
              <th className="px-4 py-3 text-right">Atend.</th>
              <th className="px-4 py-3 text-right">No Atend.</th>
              <th className="px-4 py-3 text-right">Contac.</th>
              <th className="px-4 py-3 text-right">Hablado</th>
              <th className="px-4 py-3 text-center">TMO</th>
              <th className="px-4 py-3 text-right">En Línea</th>
              <th className="px-4 py-3 text-center">P-Línea</th>
              <th className="px-4 py-3 text-right">ACW</th>
              <th className="px-4 py-3 text-center">P-ACW</th>
              <th className="px-4 py-3 text-right">Capac.</th>
              <th className="px-4 py-3 text-right">Admin.</th>
              <th className="px-4 py-3 text-right">Baño</th>
              <th className="px-4 py-3 text-right">Break</th>
              <th className="px-4 py-3 text-right">Almuerzo</th>
              <th className="px-4 py-3 text-center">Prod %</th>
              <th className="px-4 py-3 text-center">Ocup %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-600 text-xs">
            {filteredData.map((d, idx) => {
              const totInt = (d.c_calls || 0) + (d.c_no_atendidas || 0);
              const contactabilidad = totInt > 0 ? (d.c_calls / totInt) * 100 : 0;
              const tmo = d.c_calls > 0 ? d.t_hablado_tel / d.c_calls : 0;
              
              // Promedios ACW y En Linea
              const pacw = d.c_calls > 0 ? (d.t_acw || 0) / d.c_calls : 0;
              const pLinea = d.c_calls > 0 ? (d.t_en_linea || 0) / d.c_calls : 0;
              
              // Productividad y Ocupación
              const prod = d.t_conectado_real > 0 ? (d.t_hablado_tel / d.t_conectado_real) * 100 : 0;
              const occ = d.t_conectado_real > 0 ? ((d.t_hablado_tel + (d.t_acw || 0) + (d.t_en_linea || 0)) / d.t_conectado_real) * 100 : 0;
              
              const prodColor = prod < 70 ? 'text-red-600 font-bold bg-red-50/50' : 'text-teal-600 font-medium';
              const occColor = (occ < 95 || occ > 105) ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-slate-600 font-medium';

              return (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-3 font-mono whitespace-nowrap">{d.fecha}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{d.agente}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                      {d.servicio}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-600">{secToTime(d.t_conectado_real)}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">{d.c_calls}</td>
                  <td className="px-4 py-3 text-right font-medium text-orange-600">{d.c_no_atendidas}</td>
                  <td className="px-4 py-3 text-right font-medium text-sky-600">{contactabilidad.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-blue-600">{secToTime(d.t_hablado_tel)}</td>
                  <td className="px-4 py-3 text-center font-mono font-medium text-purple-600">{secToTime(tmo, true)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">{secToTime(d.t_en_linea)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400">{secToTime(pLinea, true)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">{secToTime(d.t_acw)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400">{secToTime(pacw, true)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{secToTime(d.t_cap)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{secToTime(d.t_admin)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{secToTime(d.t_bano)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{secToTime(d.t_break)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{secToTime(d.t_almuerzo)}</td>
                  <td className={`px-4 py-3 text-center rounded-md ${prodColor}`}>{prod.toFixed(0)}%</td>
                  <td className={`px-4 py-3 text-center rounded-md ${occColor}`}>{occ.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
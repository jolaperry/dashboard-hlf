// src/components/KpiGrid.jsx
import { useAppStore } from '../store/useAppStore';
import KpiCard from './ui/KpiCard';
import { secToTime } from '../utils/helpers';
import { Activity, Target, Clock, Hourglass, PhoneMissed, Monitor, Phone, CalendarCheck } from 'lucide-react';

export default function KpiGrid() {
  const filteredData = useAppStore((state) => state.filteredData);

  let h_tel = 0, acw = 0, en_linea = 0, con = 0, calls = 0, noCalls = 0, cortas = 0;

  filteredData.forEach(d => {
    h_tel += (d.t_hablado_tel || 0);
    acw += (d.t_acw || 0);
    en_linea += (d.t_en_linea || 0);
    con += (d.t_conectado_real || 0);
    calls += (d.c_calls || 0);
    noCalls += (d.c_no_atendidas || 0);
    cortas += (d.c_cortas || 0);
  });

  const totalInt = calls + noCalls;
  const contactabilidad = totalInt > 0 ? (calls / totalInt) * 100 : 0;
  const tmo = calls > 0 ? h_tel / calls : 0;
  const p_acw = calls > 0 ? acw / calls : 0;
  const p_linea = calls > 0 ? en_linea / calls : 0;
  const productividad = con > 0 ? (h_tel / con) * 100 : 0;
  const ocupacion = con > 0 ? ((h_tel + acw + en_linea) / con) * 100 : 0;
  const adherencia = con > 0 ? (con / (filteredData.length * 32400)) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      <KpiCard title="Productividad" value={`${productividad.toFixed(1)}%`} meta="Meta: >= 70%" equation="Hablado / Conexión" colorTheme="blue" icon={Activity} />
      <KpiCard title="Adherencia" value={`${adherencia.toFixed(1)}%`} meta="Meta: 90% - 105%" equation="Conex. / Planificado" colorTheme="teal" icon={CalendarCheck} />
      <KpiCard title="Ocupación" value={`${ocupacion.toFixed(1)}%`} meta="Meta: 95% - 105%" equation="(Habl.+ACW) / Conex." colorTheme="orange" icon={Target} />
      <KpiCard title="TMO Global" value={secToTime(tmo, true)} meta="Meta: < 3 min" equation="Hablado / Atendidas" colorTheme="indigo" icon={Clock} />
      <KpiCard title="P-ACW (Avg)" value={secToTime(p_acw, true)} meta="Meta: < 1 min" equation="ACW Total / Atendidas" colorTheme="gray" icon={Hourglass} />
      <KpiCard title="Cortas" value={cortas} meta="Informativo" equation="Bajo umbral (<20s)" colorTheme="orange" icon={PhoneMissed} />
      <KpiCard title="P-Enlinea (Avg)" value={secToTime(p_linea, true)} meta="Estados / Interacciones" equation="En Línea / Totales" colorTheme="indigo" icon={Monitor} />
      <KpiCard title="Contactabilidad" value={`${contactabilidad.toFixed(1)}%`} meta="Auxiliar" equation="Atend. / Totales" colorTheme="blue" icon={Phone} />
    </div>
  );
}
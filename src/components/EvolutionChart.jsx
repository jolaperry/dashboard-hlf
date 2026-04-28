// src/components/EvolutionChart.jsx
import { useAppStore } from '../store/useAppStore';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp } from 'lucide-react';

// Registrar los módulos de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function EvolutionChart() {
  const filteredData = useAppStore((state) => state.filteredData);

  // 1. Extraer y ordenar los días únicos
  const dates = [...new Set(filteredData.map(d => d.fecha))].sort();

  // 2. Preparar los arreglos de datos
  const dataP = [];
  const dataO = [];

  dates.forEach(date => {
    const dayData = filteredData.filter(d => d.fecha === date);
    let h = 0, con = 0, acw = 0;
    
    dayData.forEach(d => {
      h += d.t_hablado || 0;
      con += d.t_conectado_real || 0;
      acw += d.t_acw || 0;
    });

    dataP.push(con ? (h / con) * 100 : 0);
    dataO.push(con ? ((h + acw) / con) * 100 : 0);
  });

  // 3. Configurar el gráfico
  const data = {
    labels: dates,
    datasets: [
      {
        label: 'Productividad (%)',
        data: dataP,
        borderColor: '#2563eb', // Azul
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Ocupación (%)',
        data: dataO,
        borderColor: '#f97316', // Naranja
        backgroundColor: 'transparent',
        borderDash: [5, 5], // Línea punteada para diferenciar
        tension: 0.4,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, font: { family: 'Inter' } } },
      tooltip: { backgroundColor: '#1e293b', padding: 12, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } }
    },
    scales: { 
      y: { beginAtZero: true, suggestedMax: 100, grid: { borderDash: [4, 4] } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-500" />
          Evolución Diaria
        </h3>
      </div>
      <div className="flex-grow w-full h-64 relative">
        {dates.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
            No hay datos de fechas para graficar
          </div>
        )}
      </div>
    </div>
  );
}
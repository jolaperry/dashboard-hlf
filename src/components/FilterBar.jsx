// src/components/FilterBar.jsx
import { useAppStore } from '../store/useAppStore';
import { Search, Calendar, Briefcase, XCircle } from 'lucide-react';

export default function FilterBar() {
  const { filters, setFilter, clearFilters, filteredData, globalData } = useAppStore();

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4 items-end">
      
      {/* Filtro Rango de Fechas */}
      <div className="w-full lg:w-auto flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Calendar size={12} /> Periodo
        </label>
        <div className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <input 
            type="date" 
            value={filters.dateStart}
            onChange={(e) => setFilter('dateStart', e.target.value)}
            className="bg-transparent text-xs w-28 outline-none text-slate-700 font-medium cursor-pointer" 
          />
          <span className="text-slate-300">-</span>
          <input 
            type="date" 
            value={filters.dateEnd}
            onChange={(e) => setFilter('dateEnd', e.target.value)}
            className="bg-transparent text-xs w-28 outline-none text-slate-700 font-medium cursor-pointer" 
          />
        </div>
      </div>

      {/* Filtro Servicio */}
      <div className="w-full lg:w-48 flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Briefcase size={12} /> Servicio
        </label>
        <select 
          value={filters.service}
          onChange={(e) => setFilter('service', e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none text-slate-700 font-medium focus:border-blue-400 transition-colors cursor-pointer"
        >
          <option value="">Todos los servicios</option>
          <option value="Bloqueo">Bloqueo</option>
          <option value="Ingresos">Ingresos</option>
          <option value="FDS">FDS</option>
          <option value="Mesa Central">Mesa Central</option>
        </select>
      </div>

      {/* Búsqueda de Agente */}
      <div className="w-full lg:w-64 flex flex-col gap-1.5 relative">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Search size={12} /> Buscar Ejecutivo
        </label>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Nombre del agente..." 
            value={filters.agent}
            onChange={(e) => setFilter('agent', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs outline-none text-slate-700 font-medium focus:border-blue-400 transition-colors"
          />
          {filters.agent && (
            <button 
              onClick={() => setFilter('agent', '')}
              className="absolute right-2 top-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Botón de Limpiar y Contador */}
      <div className="flex gap-3 items-center w-full lg:w-auto ml-auto">
        <span className="text-[11px] font-medium text-slate-400">
          Mostrando <strong className="text-slate-700">{filteredData.length}</strong> de {globalData.length}
        </span>
        <button 
          onClick={clearFilters}
          className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
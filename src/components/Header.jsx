import { NavLink } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function Header() {
  const { isOfflineMode } = useAppStore();

  const activeStyle = "px-4 py-2 font-bold text-xs border-b-2 border-blue-600 text-blue-600 transition-colors";
  const inactiveStyle = "px-4 py-2 font-bold text-xs border-b-2 border-transparent text-slate-500 hover:text-blue-600 transition-colors";

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-[1920px] mx-auto px-4 py-2 flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] tracking-wider font-mono">
            HLF-ESPEX
          </span>
          Analítica & Supervisión
        </h1>
        
        <div className="flex gap-2 items-center">
          <div className="text-[10px] font-bold text-orange-600 border border-orange-200 bg-orange-50 px-2 py-1 rounded flex items-center gap-1 shadow-sm">
            <span className="text-orange-500">●</span> {isOfflineMode ? 'Manual' : 'En Línea'}
          </div>
        </div>
      </div>

      <nav className="max-w-[1920px] mx-auto px-4 flex gap-4 mt-1 border-b border-slate-200 overflow-x-auto scroller">
        <NavLink to="/" className={({ isActive }) => isActive ? activeStyle : inactiveStyle}>Dash General</NavLink>
        <NavLink to="/auxiliar" className={({ isActive }) => isActive ? activeStyle : inactiveStyle}>Dash Auxiliar</NavLink>
        <NavLink to="/calidad" className={({ isActive }) => isActive ? activeStyle : inactiveStyle}>Dash Calidad</NavLink>
        <NavLink to="/trafico" className={({ isActive }) => isActive ? activeStyle : inactiveStyle}>Dash Tráfico</NavLink>
      </nav>
    </header>
  );
}
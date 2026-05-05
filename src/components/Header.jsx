import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Activity, Sun, Moon } from 'lucide-react';

export default function Header() {
  const linkBase = "relative px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors";
  const activeStyle = `${linkBase} text-cyan-400 after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[2px] after:bg-cyan-400 after:rounded-full after:shadow-[0_0_10px_rgba(34,211,238,0.6)]`;
  const inactiveStyle = `${linkBase} text-slate-400 hover:text-slate-100`;

  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem('hlf-theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    localStorage.setItem('hlf-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-lg shadow-black/20">
      <div className="max-w-[1920px] mx-auto px-6 h-14 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-black text-white tracking-wide">HLF-ESPEX</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-mono">Analítica & Supervisión</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            aria-label="Cambiar tema"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-all"
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          <div className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
            En Línea
          </div>
        </div>
      </div>

      <nav className="max-w-[1920px] mx-auto px-4 flex gap-1 border-t border-slate-800 overflow-x-auto scroller">
        <NavLink to="/" end className={({ isActive }) => isActive ? activeStyle : inactiveStyle}>Dashboard General</NavLink>
        <NavLink to="/analytic-hora" className={({ isActive }) => isActive ? activeStyle : inactiveStyle}>Analytics</NavLink>
        <NavLink to="/monitor" className={({ isActive }) => isActive ? activeStyle : inactiveStyle}>Monitor en Vivo</NavLink>
        <NavLink to="/horarios" className={({ isActive }) => isActive ? activeStyle : inactiveStyle}>Horarios</NavLink>
      </nav>
    </header>
  );
}

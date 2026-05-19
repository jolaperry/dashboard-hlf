import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import DashboardGeneral from './pages/DashboardGeneral';
import MonitorGeneral from './pages/MonitorGeneral';
import Horarios from './pages/Horarios';
import AnalyticHora from './pages/AnalyticHora';
import ResumenGeneral from './pages/ResumenGeneral';
import TiemposEstados from './pages/TiemposEstados';

function App() {
  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="max-w-[1920px] mx-auto px-4 py-6 w-full flex-grow relative">
          <Routes>
            <Route path="/" element={<DashboardGeneral />} />
            <Route path="/analytic-hora" element={<AnalyticHora />} />
            <Route path="/monitor" element={<MonitorGeneral />} />
            <Route path="/horarios" element={<Horarios />} />
            <Route path="/resumen-general" element={<ResumenGeneral />} />
            <Route path="/tiempos-estados" element={<TiemposEstados />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import DashboardGeneral from './pages/DashboardGeneral';
import DashboardAuxiliar from './pages/DashboardAuxiliar';
import DashboardCalidad from './pages/DashboardCalidad';
import DashboardTrafico from './pages/DashboardTrafico';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="max-w-[1920px] mx-auto px-4 py-6 w-full flex-grow relative">
          <Routes>
            <Route path="/" element={<DashboardGeneral />} />
            <Route path="/auxiliar" element={<DashboardAuxiliar />} />
            <Route path="/calidad" element={<DashboardCalidad />} />
            <Route path="/trafico" element={<DashboardTrafico />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

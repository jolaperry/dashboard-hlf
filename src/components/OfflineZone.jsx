import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { UploadCloud, Database } from 'lucide-react';

export default function OfflineZone() {
  // Traemos todo lo necesario de nuestro estado global (Zustand)
  const { setRawData, rawData, processAllData, isLoading } = useAppStore();
  
  // Estados locales para mostrar el progreso en la interfaz
  const [baseStatus, setBaseStatus] = useState('Esperando archivo...');
  const [auxStatus, setAuxStatus] = useState('Esperando archivo...');

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const setStatus = type === 'base' ? setBaseStatus : setAuxStatus;
    setStatus('⏳ Procesando (Puede tardar unos segundos)...');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target.result;
      
      // Instanciamos el Web Worker (esto corre en segundo plano)
      const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), { type: 'module' });
      
      // Escuchamos la respuesta del Worker
      worker.onmessage = (msgEvent) => {
        const { success, data, error } = msgEvent.data;
        if (success) {
          setRawData(type, data);
          setStatus('✅ Archivo cargado correctamente');
        } else {
          setStatus('❌ Error: ' + error);
        }
        worker.terminate(); // Es importante cerrar el worker para liberar memoria
      };

      // Si el Worker falla drásticamente
      worker.onerror = () => {
        setStatus('❌ Error crítico en el Worker');
        worker.terminate();
      };

      // Enviamos el archivo pesado al Worker para que lo procese
      worker.postMessage({ fileBuffer: arrayBuffer, fileType: type });
    };
    
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-slate-200 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
        <UploadCloud className="text-slate-400" /> Carga Manual de Reportes (Modo Offline)
      </h2>
      <p className="text-xs text-slate-500 mb-6">
        Para procesar los datos, por favor carga ambos archivos para cruzar la información.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Dropzone Base General */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl p-8 cursor-pointer hover:bg-blue-50 transition-colors shadow-sm group relative">
          <UploadCloud className="text-blue-400 w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
          <span className="text-blue-700 font-bold text-sm mb-1">1. Cargar Base General</span>
          <span className="text-[10px] text-blue-500 mb-2">Reporte Detallado y Estados</span>
          <div className={`text-xs font-bold ${baseStatus.includes('✅') ? 'text-green-600' : 'text-slate-400'}`}>
            {baseStatus}
          </div>
          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'base')} />
        </label>

        {/* Dropzone Data Auxiliar */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-xl p-8 cursor-pointer hover:bg-purple-50 transition-colors shadow-sm group relative">
          <Database className="text-purple-400 w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
          <span className="text-purple-700 font-bold text-sm mb-1">2. Cargar Data Auxiliar</span>
          <span className="text-[10px] text-purple-500 mb-2">Reporte de Llamadas Telefónicas</span>
          <div className={`text-xs font-bold ${auxStatus.includes('✅') ? 'text-green-600' : 'text-slate-400'}`}>
            {auxStatus}
          </div>
          <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileUpload(e, 'auxiliar')} />
        </label>
      </div>

      {/* Botón de Procesamiento: Solo aparece cuando ambos Excels están cargados en memoria */}
      {rawData.base && rawData.auxiliar && (
        <div className="mt-8 flex justify-center animate-fade-in">
          <button 
            onClick={processAllData}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-8 rounded-full shadow-lg text-sm transition-transform hover:scale-105 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Calculando KPIs...
              </>
            ) : (
              '🚀 Procesar Datos y Ver Dashboards'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
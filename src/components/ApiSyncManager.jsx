// 3. Crear componente para inyectar la sesión en la Interfaz (src/components/ApiSyncManager.jsx)
import { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';

export const ApiSyncManager = () => {
    const { fetchAndProcessData, setPhpsessid, isLoading, error } = useDashboardStore();
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [sessionId, setSessionId] = useState('');

    const handleSync = () => {
        setPhpsessid(sessionId);
        fetchAndProcessData(fecha, fecha);
    };

    return (
        <div className="p-4 bg-white rounded shadow flex gap-4 items-end mb-4">
            <div>
                <label className="block text-sm font-bold mb-1">PHPSESSID</label>
                <input 
                    type="password" 
                    className="border p-2 rounded"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="qjtqc4o6k4q..."
                />
            </div>
            <div>
                <label className="block text-sm font-bold mb-1">Fecha</label>
                <input 
                    type="date" 
                    className="border p-2 rounded"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                />
            </div>
            <button 
                onClick={handleSync}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? 'Sincronizando...' : 'Sincronizar API'}
            </button>
            {error && <span className="text-red-500 font-bold">{error}</span>}
        </div>
    );
};
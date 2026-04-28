// 2. Integrar en tu store de Zustand (src/store/useDashboardStore.js)
import { create } from 'zustand';
import { fetchLlamadas } from '../api/hlfService';
import { processData } from '../utils/dataProcessor';

export const useDashboardStore = create((set, get) => ({
    baseData: [],
    processedData: {},
    isLoading: false,
    error: null,
    phpsessid: '', // Almacenar la cookie de sesión ingresada por el usuario

    setPhpsessid: (id) => set({ phpsessid: id }),

    fetchAndProcessData: async (fechaInicio, fechaTermino) => {
        const { phpsessid } = get();
        if (!phpsessid) {
            set({ error: "Ingresa tu PHPSESSID para automatizar" });
            return;
        }

        set({ isLoading: true, error: null });
        try {
            const llamadasLimpias = await fetchLlamadas(fechaInicio, fechaTermino, phpsessid);
            const resultadosCalculados = processData(llamadasLimpias); // Pasa la data extraída a tu procesador
            
            set({ 
                baseData: llamadasLimpias,
                processedData: resultadosCalculados,
                isLoading: false 
            });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    }
}));
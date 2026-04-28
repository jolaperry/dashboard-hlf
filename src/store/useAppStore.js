// src/store/useAppStore.js
import { create } from 'zustand';
import { processData } from '../utils/dataProcessor';

export const useAppStore = create((set, get) => ({
  isOfflineMode: true,
  isLoading: false,
  error: null,
  
  rawData: {
    base: null,
    auxiliar: null
  },
  
  globalData: [],
  filteredData: [],

  // --- NUEVO: Estado de los filtros ---
  filters: {
    dateStart: '',
    dateEnd: '',
    service: '',
    agent: ''
  },

  setLoading: (status) => set({ isLoading: status }),
  setError: (msg) => set({ error: msg, isLoading: false }),
  
  setRawData: (type, data) => set((state) => ({
    rawData: {
      ...state.rawData,
      [type]: data
    }
  })),

  processAllData: () => {
    const { rawData } = get();
    
    if (!rawData.base?.detail || !rawData.auxiliar?.aux) {
      console.warn("Faltan datos para procesar");
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const processed = processData(
        rawData.base.detail,
        rawData.base.states,
        rawData.auxiliar.aux
      );

      set({ 
        globalData: processed, 
        filteredData: processed, // Al inicio, los datos filtrados son todos los datos
        isLoading: false 
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // --- NUEVO: Función para actualizar un filtro y recalcular ---
  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value }
    }));
    get().applyFilters();
  },

  // --- NUEVO: Función para limpiar filtros ---
  clearFilters: () => {
    set({
      filters: { dateStart: '', dateEnd: '', service: '', agent: '' }
    });
    get().applyFilters();
  },

  // --- NUEVO: Motor de filtrado ---
  applyFilters: () => {
    const { globalData, filters } = get();
    
    const result = globalData.filter(d => {
      // Filtro por Fecha
      if (filters.dateStart && d.fecha < filters.dateStart) return false;
      if (filters.dateEnd && d.fecha > filters.dateEnd) return false;
      
      // Filtro por Servicio
      if (filters.service && d.servicio.toLowerCase() !== filters.service.toLowerCase()) return false;
      
      // Filtro por Agente (Búsqueda parcial)
      if (filters.agent && !d.agente.toLowerCase().includes(filters.agent.toLowerCase())) return false;
      
      return true;
    });

    set({ filteredData: result });
  }
}));
import * as XLSX from 'xlsx';

self.onmessage = function (e) {
  const { fileBuffer, fileType } = e.data;

  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    
    // Función para convertir Array de Arrays en Array de Objetos con llaves limpias
    const toObj = (sheet) => {
      if (!sheet) return [];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (json.length < 2) return [];
      
      // Buscar la fila que contiene los encabezados (a veces el Excel trae filas vacías arriba)
      let hIdx = json.findIndex(r => r && r.some(c => String(c).toLowerCase().includes('agente') || String(c).toLowerCase().includes('rut')));
      if (hIdx === -1) hIdx = 0;
      
      // Limpiar encabezados (quitar tildes, espacios por guiones bajos y pasar a minúsculas)
      const headers = json[hIdx].map(x => String(x).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_'));
      
      return json.slice(hIdx + 1).map(row => {
        let obj = {};
        headers.forEach((key, i) => { obj[key] = row[i] !== undefined ? row[i] : ""; });
        return obj;
      });
    };

    let processedData = {};

    if (fileType === 'base') {
      const sheetDetalle = workbook.Sheets["Reporte Detallado Agentes"] || workbook.Sheets[workbook.SheetNames[0]];
      const sheetEstados = workbook.Sheets["Estados por Agente"] || workbook.Sheets[workbook.SheetNames[1]];
      
      if (!sheetDetalle || !sheetEstados) {
        throw new Error("Faltan hojas requeridas en el archivo base.");
      }

      processedData.detail = toObj(sheetDetalle);
      processedData.states = toObj(sheetEstados);
    } 
    else if (fileType === 'auxiliar') {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      processedData.aux = toObj(sheet);
    }

    self.postMessage({ success: true, data: processedData, type: fileType });

  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
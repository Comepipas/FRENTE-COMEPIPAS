window.FrenteExcel = (() => {
  "use strict";
  function ensure() {
    if (!window.XLSX) throw new Error("No se ha cargado la librería de Excel.");
    return window.XLSX;
  }
  function safeName(value, fallback="Hoja1") {
    const name = String(value || fallback).replace(/[\\/?*\[\]:]/g, " ").trim();
    return (name || fallback).slice(0, 31);
  }
  function writeFile(filename, sheets) {
    const XLSX = ensure();
    const wb = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([name, rows]) => {
      const ws = Array.isArray(rows) && rows.length && !Array.isArray(rows[0])
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet(rows || []);
      if (ws["!ref"]) {
        const range = XLSX.utils.decode_range(ws["!ref"]);
        const widths = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          let max = 10;
          for (let r = range.s.r; r <= Math.min(range.e.r, 300); r++) {
            const cell = ws[XLSX.utils.encode_cell({r,c})];
            if (cell && cell.v != null) max = Math.min(40, Math.max(max, String(cell.v).length + 2));
          }
          widths.push({wch:max});
        }
        ws["!cols"] = widths;
        ws["!autofilter"] = {ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:0,c:range.e.c}})};
        ws["!freeze"] = {xSplit:0,ySplit:1};
      }
      XLSX.utils.book_append_sheet(wb, ws, safeName(name));
    });
    XLSX.writeFile(wb, filename, {compression:true});
  }
  function readFile(file) {
    const XLSX = ensure();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));
      reader.onload = () => {
        try {
          const wb = XLSX.read(reader.result, {type:"array", cellDates:true});
          resolve(wb);
        } catch (error) { reject(error); }
      };
      reader.readAsArrayBuffer(file);
    });
  }
  function sheetRows(wb, sheetName) {
    const XLSX = ensure();
    const ws = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(ws, {header:1, defval:"", raw:false, dateNF:"yyyy-mm-dd"});
  }
  return {writeFile, readFile, sheetRows};
})();
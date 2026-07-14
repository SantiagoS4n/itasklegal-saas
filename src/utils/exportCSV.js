/**
 * Exporta un array de objetos a un archivo CSV descargable.
 * @param {Array} rows - Datos a exportar
 * @param {Array} columns - [{ key, label }] columnas a incluir y sus encabezados
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export function exportToCSV(rows, columns, filename = 'export') {
  if (!rows || rows.length === 0) {
    alert('No data to export');
    return;
  }

  // Escapar valores que contengan comas, comillas o saltos de línea
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Obtener valor de campo anidado (ej: 'law_firm.firm_name')
  const getVal = (obj, path) =>
    path.split('.').reduce((o, k) => o?.[k], obj);

  // Encabezados
  const header = columns.map(c => escape(c.label)).join(',');

  // Filas
  const body = rows.map(row =>
    columns.map(c => escape(getVal(row, c.key))).join(',')
  ).join('\n');

  const csv = header + '\n' + body;

  // BOM para que Excel reconozca UTF-8 (acentos, ñ)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

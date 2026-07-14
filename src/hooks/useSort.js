import { useState, useMemo } from 'react';

/**
 * Hook reutilizable para ordenar arrays de objetos
 * @param {Array} data - Array de datos a ordenar
 * @param {string} defaultKey - Campo por defecto para ordenar
 * @param {string} defaultDir - Dirección por defecto: 'asc' | 'desc'
 */
export function useSort(data = [], defaultKey = '', defaultDir = 'asc') {
  const [sort, setSort] = useState({ key: defaultKey, dir: defaultDir });

  const toggle = (key) => {
    setSort(s => ({
      key,
      dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const icon = (key) => {
    if (sort.key !== key) return ' ↕';
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  };

  const sorted = useMemo(() => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      // Soporte para campos anidados: 'law_firm.firm_name'
      const getVal = (obj, path) => {
        const val = path.split('.').reduce((o, k) => o?.[k], obj);
        return val ?? '';
      };

      const valA = getVal(a, sort.key);
      const valB = getVal(b, sort.key);

      // Numérico
      const numA = parseFloat(String(valA).replace(/[^0-9.-]/g, ''));
      const numB = parseFloat(String(valB).replace(/[^0-9.-]/g, ''));
      if (!isNaN(numA) && !isNaN(numB)) {
        return sort.dir === 'asc' ? numA - numB : numB - numA;
      }

      // Fecha
      const dateA = Date.parse(valA);
      const dateB = Date.parse(valB);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return sort.dir === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // Texto
      return sort.dir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [data, sort]);

  return { sorted, toggle, icon, sort };
}

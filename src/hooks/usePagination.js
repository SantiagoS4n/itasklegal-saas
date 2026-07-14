import { useState, useMemo } from 'react';

/**
 * Hook reutilizable para paginar arrays
 * @param {Array} data - Array completo de datos
 * @param {number} pageSize - Registros por página (default 25)
 */
export function usePagination(data = [], pageSize = 25) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Si el filtro reduce los datos y la página actual ya no existe, volver a 1
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  const goTo    = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const next    = () => goTo(safePage + 1);
  const prev    = () => goTo(safePage - 1);
  const reset   = () => setPage(1);

  return {
    paginated,
    page: safePage,
    totalPages,
    total: data.length,
    pageSize,
    goTo,
    next,
    prev,
    reset,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

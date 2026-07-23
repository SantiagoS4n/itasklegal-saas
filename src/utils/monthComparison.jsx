/**
 * Calcula el cambio porcentual entre los últimos dos meses de un array
 * ordenado ascendente por mes, usando el campo indicado.
 * Retorna null si no hay suficientes datos.
 */
export function getMonthComparison(monthlyData, field) {
  if (!monthlyData || monthlyData.length < 2) return null;
  const last = monthlyData[monthlyData.length - 1];
  const prev = monthlyData[monthlyData.length - 2];
  const lastVal = parseFloat(last[field]) || 0;
  const prevVal = parseFloat(prev[field]) || 0;
  if (prevVal === 0) return null;
  const pct = ((lastVal - prevVal) / prevVal) * 100;
  return { pct, up: pct >= 0, prevMonth: prev.month || prev.month_sort };
}

/**
 * Píldora visual: ↑ 18% vs last month
 */
export function MonthComparisonBadge({ comparison, className, styles }) {
  if (!comparison) return null;
  const { pct, up } = comparison;
  const color = up ? 'var(--success)' : 'var(--danger)';
  const arrow = up ? '↑' : '↓';
  return (
    <span className={className} style={{ color, fontSize: 11, fontWeight: 700, marginLeft: 6 }}>
      {arrow} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

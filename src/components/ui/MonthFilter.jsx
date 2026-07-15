import styles from './MonthFilter.module.css';

/**
 * Filtro por mes reutilizable.
 * value: string 'YYYY-MM' o '' para "todos"
 * onChange: recibe el nuevo valor
 */
export function MonthFilter({ value, onChange, label = 'Month' }) {
  return (
    <div className={styles.wrap}>
      <input
        type="month"
        className={styles.input}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className={styles.clear} onClick={() => onChange('')} title="Show all">
          ✕ All
        </button>
      )}
    </div>
  );
}

/**
 * Filtra un array por un campo de fecha que empiece con 'YYYY-MM'.
 * Si month está vacío, devuelve todo.
 */
export function filterByMonth(rows, dateField, month) {
  if (!month) return rows;
  return rows.filter(r => (r[dateField] || '').startsWith(month));
}

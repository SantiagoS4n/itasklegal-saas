import styles from './TableSkeleton.module.css';

/**
 * Filas skeleton animadas para mostrar mientras carga una tabla.
 * @param {number} rows - Número de filas skeleton (default 8)
 * @param {number} cols - Número de columnas (default 6)
 */
export function TableSkeleton({ rows = 8, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className={styles.row}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className={styles.cell}>
              <div
                className={styles.bar}
                style={{ width: `${50 + ((r + c) % 4) * 12}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

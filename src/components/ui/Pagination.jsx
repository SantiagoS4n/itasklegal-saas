import styles from './Pagination.module.css';

export function Pagination({ page, totalPages, total, pageSize, goTo, next, prev, hasNext, hasPrev }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  // Generar páginas visibles: siempre muestra primera, última y las 2 cercanas a la actual
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.info}>
        {start}–{end} of {total}
      </span>

      <div className={styles.controls}>
        <button className={styles.btn} onClick={prev} disabled={!hasPrev}>← Prev</button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`dots-${i}`} className={styles.dots}>…</span>
            : <button
                key={p}
                className={`${styles.btn} ${p === page ? styles.active : ''}`}
                onClick={() => goTo(p)}>
                {p}
              </button>
        )}

        <button className={styles.btn} onClick={next} disabled={!hasNext}>Next →</button>
      </div>

      <div className={styles.pageSize}>
        <span>Per page</span>
      </div>
    </div>
  );
}

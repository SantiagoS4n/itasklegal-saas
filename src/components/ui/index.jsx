import styles from './ui.module.css';

export function Spinner({ size = 18 }) {
  return (
    <span className={styles.spinner} style={{ width: size, height: size }} />
  );
}

export function Button({ children, variant = 'primary', size = 'md', disabled, loading, onClick, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles['btn-' + variant]} ${styles['btn-' + size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <div className={`${styles.field} ${className}`}>
      {label && <label className={styles.fieldLabel}>{label}</label>}
      {children}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`${styles.input} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return <select className={`${styles.select} ${className}`} {...props}>{children}</select>;
}

export function ModalGrid({ children }) {
  return <div className={styles.modalGrid}>{children}</div>;
}

export function ModalActions({ children }) {
  return <div className={styles.modalActions}>{children}</div>;
}

/** Header de tabla ordenable — úsalo con el hook useSort */
export function SortableTh({ sortKey, icon, onToggle, children, className = '', style = {} }) {
  return (
    <th
      className={`${styles.sortableTh} ${className}`}
      style={style}
      onClick={() => onToggle(sortKey)}
    >
      {children}{icon(sortKey)}
    </th>
  );
}

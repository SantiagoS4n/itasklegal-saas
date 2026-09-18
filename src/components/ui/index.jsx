import { useEffect, useRef, useState } from 'react';
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

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${styles.textarea} ${className}`} {...props} />;
}

/**
 * Dropdown con búsqueda por texto, para listas largas donde un <select>
 * nativo se vuelve incómodo de recorrer (ej. asignar a un asistente).
 */
export function SearchSelect({
  value, onChange, options,
  getOptionValue = o => o.value,
  getOptionLabel = o => o.label,
  placeholder = 'Search…',
  emptyText = 'No results',
  className = '',
}) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const wrapRef = useRef(null);

  const selected = options.find(o => String(getOptionValue(o)) === String(value));

  useEffect(() => {
    if (!open) setQuery(selected ? getOptionLabel(selected) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  useEffect(() => {
    const onDocMouseDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(o => getOptionLabel(o).toLowerCase().includes(q))
    : options;

  return (
    <div className={`${styles.searchSelect} ${className}`} ref={wrapRef}>
      <input
        className={styles.input}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
      />
      {open && (
        <div className={styles.searchSelectMenu}>
          {filtered.length === 0 && <div className={styles.searchSelectEmpty}>{emptyText}</div>}
          {filtered.map(o => (
            <div
              key={getOptionValue(o)}
              className={styles.searchSelectOption}
              onMouseDown={() => { onChange(getOptionValue(o)); setOpen(false); }}
            >
              {getOptionLabel(o)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

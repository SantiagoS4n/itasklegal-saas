import { useAuth } from '@/context/AuthContext';
import styles from './Topbar.module.css';

export function Topbar({ title, subtitle, onMenuClick }) {
  const { role } = useAuth();

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Open menu">☰</button>
        <div>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      </div>
      <div className={styles.right}>
        <span className={styles.roleChip}>{role}</span>
      </div>
    </header>
  );
}

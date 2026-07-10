import { useAuth } from '@/context/AuthContext';
import styles from './Home.module.css';

export function Home() {
  const { displayName } = useAuth();
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>⚖️</div>
      <h1 className={styles.title}>Welcome back, {displayName || 'there'}!</h1>
      <p className={styles.sub}>Select a module from the sidebar to get started.</p>
    </div>
  );
}

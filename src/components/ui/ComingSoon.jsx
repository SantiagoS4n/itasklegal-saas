import styles from './ComingSoon.module.css';

export function ComingSoon({ icon = '🚧', title, description }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.title}>{title ?? 'Coming Soon'}</div>
      {description && <div className={styles.desc}>{description}</div>}
    </div>
  );
}

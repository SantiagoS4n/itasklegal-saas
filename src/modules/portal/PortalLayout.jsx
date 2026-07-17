import { createContext, useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/config/brand';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import styles from './PortalLayout.module.css';

const ToastCtx = createContext(null);
export const usePortalToast = () => useContext(ToastCtx);

const NAV = [
  { to: '/portal',            label: 'Home',       icon: '🏠', end: true },
  { to: '/portal/assistants', label: 'Assistants', icon: '👤' },
  { to: '/portal/invoices',   label: 'Invoices',   icon: '🧾' },
  { to: '/portal/analytics',  label: 'Analytics',  icon: '📊' },
];

export function PortalLayout() {
  const { toast, show } = useToast();
  const { displayName, initials, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <ToastCtx.Provider value={show}>
      <div className={styles.shell}>
        {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

        <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.logo}>
            {BRAND.logoUrl
              ? <img src={BRAND.logoUrl} alt={BRAND.name} className={styles.logoImg} />
              : <div className={styles.logoIcon}>{BRAND.logoText}</div>}
            <div className={styles.logoText}>
              <span>{BRAND.name}</span>
              <span>Client Portal</span>
            </div>
          </div>

          <nav className={styles.nav}>
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className={styles.userRow}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userRole}>Law Firm</div>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">✕</button>
          </div>
        </aside>

        <div className={styles.main}>
          <div className={styles.topbar}>
            <button className={styles.menuBtn} onClick={() => setMobileOpen(o => !o)}>☰</button>
          </div>
          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
      <Toast toast={toast} />
    </ToastCtx.Provider>
  );
}

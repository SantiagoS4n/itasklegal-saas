import { createContext, useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/config/brand';
import { Toast } from '@/components/ui/Toast';
import { Topbar } from '@/components/layout/Topbar';
import { useToast } from '@/hooks/useToast';
import layoutStyles from '@/components/layout/AppLayout.module.css';
import styles from './PortalLayout.module.css';

const ToastCtx = createContext(null);
export const usePortalToast = () => useContext(ToastCtx);

const NAV = [
  { to: '/portal',            label: 'Home',       icon: '🏠', end: true },
  { to: '/portal/assistants', label: 'Assistants', icon: '👤' },
  { to: '/portal/invoices',   label: 'Invoices',   icon: '🧾' },
  { to: '/portal/analytics',  label: 'Analytics',  icon: '📊' },
];

const ROUTE_META = {
  '/portal':            { title: 'Home',       subtitle: 'Your firm overview' },
  '/portal/assistants': { title: 'Assistants', subtitle: 'Legal team assigned to you' },
  '/portal/invoices':   { title: 'Invoices',   subtitle: 'Billing history' },
  '/portal/analytics':  { title: 'Analytics',  subtitle: 'Your performance' },
};

export function PortalLayout() {
  const { toast, show } = useToast();
  const { displayName, initials, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const meta = ROUTE_META[pathname] ?? { title: 'Portal', subtitle: '' };

  return (
    <ToastCtx.Provider value={show}>
      <div className={layoutStyles.shell}>
        {mobileOpen && (
          <div className={layoutStyles.mobileOverlay} onClick={() => setMobileOpen(false)} />
        )}

        <div className={`${layoutStyles.sidebarWrap} ${mobileOpen ? layoutStyles.sidebarOpen : ''}`}>
          <aside className={styles.sidebar}>
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
        </div>

        <div className={layoutStyles.main}>
          <Topbar
            title={meta.title}
            subtitle={meta.subtitle}
            onMenuClick={() => setMobileOpen(o => !o)}
          />
          <main className={layoutStyles.content}>
            <Outlet />
          </main>
        </div>
      </div>
      <Toast toast={toast} />
    </ToastCtx.Provider>
  );
}

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import styles from './AppLayout.module.css';

import { createContext, useContext } from 'react';
const ToastCtx = createContext(null);
export const useAppToast = () => useContext(ToastCtx);

const ROUTE_META = {
  '/':           { title: 'Home',           subtitle: 'iTaskLegal' },
  '/law-firms':  { title: 'Law Firms',      subtitle: 'Client firms directory' },
  '/assistants': { title: 'Assistants',     subtitle: 'Manage your legal team' },
  '/invoices':   { title: 'Invoices',       subtitle: 'Billing to law firms' },
  '/payments':   { title: 'Payments',       subtitle: 'Remitly transfers & payroll' },
  '/biz-cards':  { title: 'Business Cards', subtitle: 'Prospects & contacts' },
  '/analytics':  { title: 'Analytics',      subtitle: 'KPIs & performance' },
  '/users': { title: 'Users', subtitle: 'Manage access' },
};

export function AppLayout() {
  const { toast, show } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  const meta     = ROUTE_META[pathname] ?? { title: 'iTaskLegal', subtitle: '' };
  const title    = meta.title;
  const subtitle = meta.subtitle;

  return (
    <ToastCtx.Provider value={show}>
      <div className={styles.shell}>
        {mobileOpen && (
          <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
        )}
        <div className={`${styles.sidebarWrap} ${mobileOpen ? styles.sidebarOpen : ''}`}>
          <Sidebar />
        </div>
        <div className={styles.main}>
          <Topbar
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setMobileOpen(o => !o)}
          />
          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
      <Toast toast={toast} />
    </ToastCtx.Provider>
  );
}

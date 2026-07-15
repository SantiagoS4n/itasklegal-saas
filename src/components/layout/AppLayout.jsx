import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useDirty } from '@/context/DirtyContext';
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
  '/users':      { title: 'Users',          subtitle: 'Manage access' },
  '/profile':    { title: 'My Profile',     subtitle: 'Account settings' },
};

export function AppLayout() {
  const { toast, show } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({ overdueInvoices: 0, unmatchedPayments: 0 });
  const { pathname } = useLocation();
  const { hasUnsaved } = useDirty();

  useUnsavedChanges(hasUnsaved);

  // Cargar contadores para los badges del sidebar
  const loadBadges = async () => {
    const [invRes, payRes] = await Promise.all([
      supabase.from('invoice').select('invoice_number', { count: 'exact', head: true }).eq('status', 'overdue'),
      supabase.from('remitly').select('ID', { count: 'exact', head: true }).is('assistant_id', null),
    ]);
    setBadges({
      overdueInvoices:   invRes.count || 0,
      unmatchedPayments: payRes.count || 0,
    });
  };

  useEffect(() => {
    loadBadges();
    // Recargar badges cuando cambias de módulo (por si resolviste algo)
  }, [pathname]);

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
          <Sidebar badges={badges} />
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

import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDirty } from '@/context/DirtyContext';
import styles from './Sidebar.module.css';

const NAV = [
  { section: 'Main' },
  { to: '/',           label: 'Home',           icon: '🏠' },
  { to: '/users',      label: 'Users',          icon: '👥' },
  { section: 'People' },
  { to: '/assistants', label: 'Assistants',      icon: '👤' },
  { to: '/biz-cards',  label: 'Business Cards',  icon: '💼' },
  { section: 'Clients' },
  { to: '/law-firms',  label: 'Law Firms',       icon: '⚖️' },
  { section: 'Finance' },
  { to: '/invoices',   label: 'Invoices',        icon: '🧾' },
  { to: '/payments',   label: 'Payments',        icon: '💸', badge: true },
  { section: 'Reports' },
  { to: '/analytics',  label: 'Analytics',       icon: '📊' },
];

export function Sidebar({ pendingPayments = 0 }) {
  const { displayName, role, initials, signOut } = useAuth();
  const { hasUnsaved, clearAll } = useDirty();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('itl_sidebar') === '1'
  );

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem('itl_sidebar', !c ? '1' : '0');
      return !c;
    });
  };

  // Interceptar navegación si hay cambios sin guardar
  const handleNavClick = (e, to) => {
    if (to === location.pathname) return; // misma ruta, no hacer nada
    if (hasUnsaved) {
      e.preventDefault();
      const ok = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.'
      );
      if (ok) {
        clearAll();
        navigate(to);
      }
    }
  };

  const handleLogout = async () => {
    if (hasUnsaved) {
      const ok = window.confirm('You have unsaved changes. Sign out anyway?');
      if (!ok) return;
    }
    clearAll();
    await signOut();
    navigate('/login');
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>iT</div>
        <div className={styles.logoText}>
          <span>iTaskLegal</span>
          <span>Platform</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV.map((item, i) => {
          if (item.section) {
            return <div key={i} className={styles.sectionLabel}>{item.section}</div>;
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={(e) => handleNavClick(e, item.to)}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              data-label={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge && pendingPayments > 0 && (
                <span className={styles.badge}>{pendingPayments}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <button className={styles.collapseBtn} onClick={toggle}>
        <span className={`${styles.collapseIcon} ${collapsed ? styles.flipped : ''}`}>◀</span>
        <span className={styles.collapseLabel}>Collapse</span>
      </button>

      <div className={styles.userRow}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{displayName}</div>
          <div className={styles.userRole}>{role}</div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">✕</button>
      </div>
    </aside>
  );
}

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import styles from './Sidebar.module.css';
import logo from '@/assets/iTaskLegal.jpeg';

const NAV = [
  { section: 'Main' },
  { to: '/',           label: 'Home',           icon: '🏠' },
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
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('itl_sidebar') === '1'
  );

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem('itl_sidebar', !c ? '1' : '0');
      return !c;
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <img className={styles.logoImg} src={logo} alt="iTaskLegal logo" />
        </div>
        <div className={styles.logoText}>
          <span>iTaskLegal</span>
          <span>CRM Platform</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} className={styles.sectionLabel}>{item.section}</div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
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

      {/* Collapse toggle */}
      <button className={styles.collapseBtn} onClick={toggle}>
        <span className={`${styles.collapseIcon} ${collapsed ? styles.flipped : ''}`}>◀</span>
        <span className={styles.collapseLabel}>Collapse</span>
      </button>

      {/* User */}
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

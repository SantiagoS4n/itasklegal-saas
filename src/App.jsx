import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import { AppLayout }  from '@/components/layout/AppLayout';
import { Login }      from '@/modules/auth/Login';
import { Home }       from '@/modules/home/Home';
import { LawFirms }   from '@/modules/lawfirms/LawFirms';
import { Assistants } from '@/modules/assistants/Assistants';
import { Invoices }   from '@/modules/invoices/Invoices';
import { Payments }   from '@/modules/payments/Payments';
import { BizCards }   from '@/modules/bizcards/BizCards';
import { Analytics }  from '@/modules/analytics/Analytics';
import { Users }      from '@/modules/users/Users';
import { Profile }    from '@/modules/profile/Profile';

import { PortalLayout }     from '@/modules/portal/PortalLayout';
import { PortalHome }       from '@/modules/portal/PortalHome';
import { PortalAssistants } from '@/modules/portal/PortalAssistants';
import { PortalInvoices }   from '@/modules/portal/PortalInvoices';
import { PortalAnalytics }  from '@/modules/portal/PortalAnalytics';

// Detecta sesión expirada y redirige al login con mensaje
function SessionWatcher() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      const wasLoggedIn = sessionStorage.getItem('itl_was_logged_in');
      if (wasLoggedIn) {
        sessionStorage.removeItem('itl_was_logged_in');
        navigate('/login?expired=1', { replace: true });
      }
    }
    if (!loading && user) {
      sessionStorage.setItem('itl_was_logged_in', '1');
    }
  }, [user, loading]);

  return null;
}

// Solo admin — si es firm, lo manda a su portal
function AdminRoute({ children }) {
  const { user, profile, loading, signOut } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === 'firm') return <Navigate to="/portal" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/login" replace />;
  if (profile?.active === false) {
    signOut();
    return <Navigate to="/login?deactivated=1" replace />;
  }
  return children;
}

// Solo firm — si es admin, lo manda al admin
function FirmRoute({ children }) {
  const { user, profile, loading, signOut } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === 'admin') return <Navigate to="/" replace />;
  if (profile?.role !== 'firm') return <Navigate to="/login" replace />;
  if (profile?.active === false) {
    signOut();
    return <Navigate to="/login?deactivated=1" replace />;
  }
  return children;
}

// Login: redirige según el rol una vez autenticado
function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return profile?.role === 'firm'
      ? <Navigate to="/portal" replace />
      : <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionWatcher />
      <Routes>

        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />

        {/* ── Admin ── */}
        <Route element={
          <AdminRoute><AppLayout /></AdminRoute>
        }>
          <Route index           element={<Home />} />
          <Route path="law-firms"  element={<LawFirms />} />
          <Route path="assistants" element={<Assistants />} />
          <Route path="invoices"   element={<Invoices />} />
          <Route path="payments"   element={<Payments />} />
          <Route path="biz-cards"  element={<BizCards />} />
          <Route path="analytics"  element={<Analytics />} />
          <Route path="users"      element={<Users />} />
          <Route path="profile"    element={<Profile />} />
        </Route>

        {/* ── Firm Portal ── */}
        <Route path="/portal" element={
          <FirmRoute><PortalLayout /></FirmRoute>
        }>
          <Route index          element={<PortalHome />} />
          <Route path="assistants" element={<PortalAssistants />} />
          <Route path="invoices"   element={<PortalInvoices />} />
          <Route path="analytics"  element={<PortalAnalytics />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
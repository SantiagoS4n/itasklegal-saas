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

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionWatcher />
      <Routes>

        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />

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
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

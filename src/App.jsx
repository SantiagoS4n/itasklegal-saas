import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />

        <Route element={
          <ProtectedRoute><AppLayout /></ProtectedRoute>
        }>
          <Route index           element={<Home />} />
          <Route path="law-firms"  element={<LawFirms />} />
          <Route path="assistants" element={<Assistants />} />
          <Route path="invoices"   element={<Invoices />} />
          <Route path="payments"   element={<Payments />} />
          <Route path="biz-cards"  element={<BizCards />} />
          <Route path="analytics"  element={<Analytics />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

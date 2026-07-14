import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/context/AuthContext';
import { DirtyProvider } from '@/context/DirtyContext';
import App from '@/App';
import '@/styles/base.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DirtyProvider>
        <App />
      </DirtyProvider>
    </AuthProvider>
  </StrictMode>
);

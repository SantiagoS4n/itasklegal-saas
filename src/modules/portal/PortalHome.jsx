import { useAuth } from '@/context/AuthContext';

export function PortalHome() {
  const { displayName } = useAuth();
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Welcome, {displayName} 👋</h1>
      <p style={{ color: 'var(--text-2)', marginTop: 6 }}>
        Portal dashboard coming in the next step.
      </p>
    </div>
  );
}

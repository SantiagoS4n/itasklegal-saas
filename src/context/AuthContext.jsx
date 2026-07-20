import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('user_profile')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Sesión cerrada o token no renovable → limpiar estado
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        // Login real → esperar el perfil antes de destrabar rutas
        if (event === 'SIGNED_IN') {
          setLoading(true);
          setUser(session?.user ?? null);
          if (session?.user) await fetchProfile(session.user.id);
          setLoading(false);
        }
        // Token renovado en segundo plano (foco de pestaña, etc.)
        // → solo actualizar el user, SIN bloquear la app ni recargar el perfil
        if (event === 'TOKEN_REFRESHED' && session) {
          setUser(session.user);
        }
        // Sesión expirada por inactividad
        if (event === 'USER_UPDATED') {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  const displayName = profile?.full_name
    ?? user?.email?.split('@')[0]
    ?? '';

  const role   = profile?.role   ?? 'admin';
  const firmId = profile?.firm_id ?? null;

  const initials = displayName
    .trim()
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signOut,
      displayName, role, firmId, initials,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
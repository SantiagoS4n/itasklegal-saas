import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/config/brand';
import styles from './Login.module.css';

export function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const expired    = params.get('expired') === '1';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate('/');
  };

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.logo}>
          {BRAND.logoUrl
            ? <img src={BRAND.logoUrl} alt={BRAND.name} className={styles.logoImg} />
            : <div className={styles.logoIcon}>{BRAND.logoText}</div>}
          <div>
            <div className={styles.logoName}>{BRAND.name}</div>
            <div className={styles.logoSub}>Sign in to continue</div>
          </div>
        </div>

        {expired && (
          <div className={styles.expiredBanner}>
            🔒 Your session expired. Please sign in again.
          </div>
        )}

        <label className={styles.label} htmlFor="email">Email</label>
        <input id="email" className={styles.input} type="email" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
          autoComplete="email" required />

        <label className={styles.label} htmlFor="password">Password</label>
        <input id="password" className={styles.input} type="password" value={password}
          onChange={e => setPassword(e.target.value)} placeholder="••••••••"
          autoComplete="current-password" required />

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAppToast } from '@/components/layout/AppLayout';
import { Button, Field, Input } from '@/components/ui/index';
import styles from './Profile.module.css';

export function Profile() {
  const { user, displayName, role, initials } = useAuth();
  const toast = useAppToast();

  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => { setFullName(displayName || ''); }, [displayName]);

  // ── Guardar nombre ──
  const saveName = async () => {
    if (!fullName.trim()) { toast('⚠️ Name cannot be empty', 'warning'); return; }
    setSavingName(true);
    const { error } = await supabase
      .from('user_profile')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id);
    setSavingName(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ Name updated — refresh to see it everywhere');
  };

  // ── Cambiar contraseña ──
  const savePassword = async () => {
    if (pw1.length < 6)  { toast('⚠️ Password must be at least 6 characters', 'warning'); return; }
    if (pw1 !== pw2)     { toast('⚠️ Passwords do not match', 'warning'); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setSavingPw(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ Password changed successfully');
    setPw1(''); setPw2('');
  };

  return (
    <div className={styles.wrap}>
      {/* Header con avatar */}
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>{initials}</div>
        <div>
          <h1 className={styles.name}>{displayName}</h1>
          <div className={styles.meta}>
            <span className={styles.roleBadge}>{role}</span>
            <span className={styles.email}>{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Cambiar nombre */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Display Name</div>
        <div className={styles.cardBody}>
          <Field label="Full Name">
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
          </Field>
          <Button variant="primary" loading={savingName} onClick={saveName}>
            Save Name
          </Button>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Change Password</div>
        <div className={styles.cardBody}>
          <Field label="New Password">
            <Input type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="Min 6 characters" />
          </Field>
          <Field label="Confirm New Password">
            <Input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat password" />
          </Field>
          <Button variant="primary" loading={savingPw} onClick={savePassword}>
            Update Password
          </Button>
        </div>
      </div>

      {/* Info de cuenta */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Account Info</div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Email</span>
          <span className={styles.infoValue}>{user?.email}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Role</span>
          <span className={styles.infoValue}>{role}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>User ID</span>
          <span className={styles.infoValueMono}>{user?.id}</span>
        </div>
      </div>
    </div>
  );
}

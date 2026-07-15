import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, ModalGrid, ModalActions, SortableTh } from '@/components/ui/index';
import { useSort } from '@/hooks/useSort';
import tableStyles from '@/styles/table.module.css';
import styles from './Users.module.css';

const ROLE_LABEL = { admin: 'Admin', firm: 'Law Firm' };
const ROLE_CLASS = { admin: styles.roleAdmin, firm: styles.roleFirm };

export function Users() {
  const toast = useAppToast();
  const [users,   setUsers]   = useState([]);
  const [firms,   setFirms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);

  const load = async () => {
    setLoading(true);
    const [usersRes, firmsRes] = await Promise.all([
      supabase.from('user_profile').select('*, law_firm(firm_name)').order('created_at'),
      supabase.from('law_firm').select('ID_number, firm_name').order('firm_name'),
    ]);
    if (usersRes.error) toast('❌ ' + usersRes.error.message, 'error');
    else setUsers(usersRes.data);
    if (!firmsRes.error) setFirms(firmsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const { sorted, toggle, icon } = useSort(users, 'full_name', 'asc');

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove access for "${name}"? This only removes their profile, not their auth account.`)) return;
    const { error } = await supabase.from('user_profile').delete().eq('id', id);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ User removed');
    load();
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${users.length} users`}</p>
        </div>
        <Button variant="dark" onClick={() => setModal(true)}>+ New User</Button>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <SortableTh sortKey="full_name"          icon={icon} onToggle={toggle}>Name</SortableTh>
              <SortableTh sortKey="role"               icon={icon} onToggle={toggle}>Role</SortableTh>
              <SortableTh sortKey="law_firm.firm_name" icon={icon} onToggle={toggle}>Law Firm</SortableTh>
              <SortableTh sortKey="created_at"         icon={icon} onToggle={toggle}>Created</SortableTh>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={5}>Loading users…</td>
              </tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={5}>No users yet.</td>
              </tr>
            )}
            {!loading && sorted.map(u => (
              <tr key={u.id}>
                <td className={tableStyles.bold} style={{ padding: '10px 8px' }}>
                  {u.full_name || '—'}
                </td>
                <td>
                  <span className={`${styles.roleBadge} ${ROLE_CLASS[u.role]}`}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td>{u.law_firm?.firm_name || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td className={tableStyles.actCol}>
                  <button className={tableStyles.deleteBtn}
                    onClick={() => handleDelete(u.id, u.full_name)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewUserModal
        open={modal}
        firms={firms}
        onClose={() => setModal(false)}
        onSaved={() => { setModal(false); load(); }}
      />
    </div>
  );
}

/* ── Modal nuevo usuario ── */
function NewUserModal({ open, firms, onClose, onSaved }) {
  const toast = useAppToast();
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: 'firm', firm_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ email: '', password: '', full_name: '', role: 'firm', firm_id: '' });
  }, [open]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async () => {
    if (!form.email)     { toast('⚠️ Email is required', 'warning'); return; }
    if (!form.password)  { toast('⚠️ Password is required', 'warning'); return; }
    if (!form.full_name) { toast('⚠️ Name is required', 'warning'); return; }
    if (form.role === 'firm' && !form.firm_id) {
      toast('⚠️ Law Firm is required for firm users', 'warning'); return;
    }
    setSaving(true);

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email:    form.email,
      password: form.password,
      email_confirm: true,
    });

    if (authErr) {
      // Fallback: signUp normal si no hay permisos de admin
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
      });
      if (signUpErr) { toast('❌ ' + signUpErr.message, 'error'); setSaving(false); return; }

      // 2. Crear perfil
      const userId = signUpData.user?.id;
      if (userId) {
        await supabase.from('user_profile').insert({
          id:        userId,
          role:      form.role,
          firm_id:   form.firm_id || null,
          full_name: form.full_name,
        });
      }
    } else {
      const userId = authData.user?.id;
      if (userId) {
        await supabase.from('user_profile').insert({
          id:        userId,
          role:      form.role,
          firm_id:   form.firm_id || null,
          full_name: form.full_name,
        });
      }
    }

    setSaving(false);
    toast('✓ User created — they can now log in');
    onSaved();
  };

  return (
    <Modal open={open} title="New User" onClose={onClose} maxWidth={460}>
      <ModalGrid>
        <Field label="Full Name *" className="full">
          <Input value={form.full_name} onChange={set('full_name')} placeholder="John Smith" />
        </Field>
        <Field label="Email *">
          <Input type="email" value={form.email} onChange={set('email')} placeholder="john@firm.com" />
        </Field>
        <Field label="Password *">
          <Input type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
        </Field>
        <Field label="Role *" className="full">
          <Select value={form.role} onChange={set('role')}>
            <option value="firm">Law Firm</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        {form.role === 'firm' && (
          <Field label="Law Firm *" className="full">
            <Select value={form.firm_id} onChange={set('firm_id')}>
              <option value="">— Select firm —</option>
              {firms.map(f => (
                <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>
              ))}
            </Select>
          </Field>
        )}
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>Create User</Button>
      </ModalActions>
    </Modal>
  );
}

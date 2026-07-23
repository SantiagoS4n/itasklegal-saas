import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
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
  const { user: currentUser } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [firms,   setFirms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState({ open: false, mode: 'create', data: null });
  const [deleting, setDeleting] = useState(null); // id del usuario en proceso de borrado

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

  const handleToggleActive = async (u) => {
    if (u.id === currentUser?.id) {
      toast('⚠️ You cannot deactivate your own account', 'warning');
      return;
    }
    const newVal = !(u.active !== false);
    const { error } = await supabase.from('user_profile').update({ active: newVal }).eq('id', u.id);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: newVal } : x));
    toast(newVal ? '✓ User activated' : '✓ User deactivated — they can no longer log in');
  };

  const handleDelete = async (u) => {
    if (u.id === currentUser?.id) {
      toast('⚠️ You cannot delete your own account', 'warning');
      return;
    }
    const ok = confirm(
      `Delete "${u.full_name || u.email}"?\n\nThis permanently removes their login and profile. This action cannot be undone.`
    );
    if (!ok) return;

    const webhookUrl = import.meta.env.VITE_N8N_DELETE_USER_WEBHOOK;
    if (!webhookUrl) {
      toast('❌ Webhook not configured (VITE_N8N_DELETE_USER_WEBHOOK)', 'error');
      return;
    }

    setDeleting(u.id);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-token': import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',
        },
        body: JSON.stringify({ id: u.id }),
      });
      const result = await res.json().catch(() => ({}));
      setDeleting(null);

      if (!res.ok || result.error) {
        toast('❌ ' + (result.error || `Webhook responded ${res.status}`), 'error');
        return;
      }
      toast('✓ User deleted');
      load();
    } catch (err) {
      setDeleting(null);
      toast('❌ Could not reach n8n: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${users.length} users`}</p>
        </div>
        <Button variant="dark" onClick={() => setModal({ open: true, mode: 'create', data: null })}>
          + New User
        </Button>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <SortableTh sortKey="full_name"          icon={icon} onToggle={toggle}>Name</SortableTh>
              <SortableTh sortKey="role"               icon={icon} onToggle={toggle}>Role</SortableTh>
              <SortableTh sortKey="law_firm.firm_name" icon={icon} onToggle={toggle}>Law Firm</SortableTh>
              <SortableTh sortKey="created_at"         icon={icon} onToggle={toggle}>Created</SortableTh>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={6}>Loading users…</td>
              </tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={6}>No users yet.</td>
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
                <td style={{ textAlign: 'center' }}>
                  <button
                    className={u.active !== false ? styles.statusActive : styles.statusInactive}
                    onClick={() => handleToggleActive(u)}
                    title={u.active !== false ? 'Click to deactivate' : 'Click to activate'}
                  >
                    {u.active !== false ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className={tableStyles.actCol}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button className={styles.editBtn}
                      onClick={() => setModal({ open: true, mode: 'edit', data: u })}>
                      Edit
                    </button>
                    <button className={tableStyles.deleteBtn}
                      disabled={deleting === u.id}
                      onClick={() => handleDelete(u)}>
                      {deleting === u.id ? '…' : '✕'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserModal
        open={modal.open}
        mode={modal.mode}
        initial={modal.data}
        firms={firms}
        onClose={() => setModal({ open: false, mode: 'create', data: null })}
        onSaved={() => { setModal({ open: false, mode: 'create', data: null }); load(); }}
      />
    </div>
  );
}

/* ── Modal crear / editar usuario ── */
function UserModal({ open, mode, initial, firms, onClose, onSaved }) {
  const toast = useAppToast();
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: 'firm', firm_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setForm({
        email: '', password: '',
        full_name: initial.full_name || '',
        role: initial.role || 'firm',
        firm_id: initial.firm_id || '',
      });
    } else {
      setForm({ email: '', password: '', full_name: '', role: 'firm', firm_id: '' });
    }
  }, [open, isEdit, initial]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  // Editar: solo toca user_profile (nombre/rol/firma) — no requiere n8n
  const submitEdit = async () => {
    if (!form.full_name) { toast('⚠️ Name is required', 'warning'); return; }
    if (form.role === 'firm' && !form.firm_id) {
      toast('⚠️ Law Firm is required for firm users', 'warning'); return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('user_profile')
      .update({
        full_name: form.full_name,
        role: form.role,
        firm_id: form.role === 'firm' ? form.firm_id : null,
      })
      .eq('id', initial.id);
    setSaving(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ User updated');
    onSaved();
  };

  // Crear: pasa por n8n (Admin API, no toca la sesión actual)
  const submitCreate = async () => {
    if (!form.email)     { toast('⚠️ Email is required', 'warning'); return; }
    if (!form.password)  { toast('⚠️ Password is required', 'warning'); return; }
    if (!form.full_name) { toast('⚠️ Name is required', 'warning'); return; }
    if (form.role === 'firm' && !form.firm_id) {
      toast('⚠️ Law Firm is required for firm users', 'warning'); return;
    }

    const webhookUrl = import.meta.env.VITE_N8N_CREATE_USER_WEBHOOK;
    if (!webhookUrl) {
      toast('❌ Webhook not configured (VITE_N8N_CREATE_USER_WEBHOOK)', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-token': import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',
        },
        body: JSON.stringify({
          email:     form.email,
          password:  form.password,
          full_name: form.full_name,
          role:      form.role,
          firm_id:   form.firm_id || null,
        }),
      });
      const result = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok || result.error) {
        toast('❌ ' + (result.error || `Webhook responded ${res.status}`), 'error');
        return;
      }
    } catch (err) {
      setSaving(false);
      toast('❌ Could not reach n8n: ' + err.message, 'error');
      return;
    }

    toast('✓ User created — they can now log in');
    onSaved();
  };

  const submit = isEdit ? submitEdit : submitCreate;

  return (
    <Modal open={open} title={isEdit ? 'Edit User' : 'New User'} onClose={onClose} maxWidth={460}>
      <ModalGrid>
        <Field label="Full Name *" className="full">
          <Input value={form.full_name} onChange={set('full_name')} placeholder="John Smith" />
        </Field>

        {!isEdit && (
          <>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={set('email')} placeholder="john@firm.com" />
            </Field>
            <Field label="Password *">
              <Input type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
            </Field>
          </>
        )}

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

        {isEdit && (
          <div className={styles.editNote}>
            Email and password can't be changed here. To reset a password, delete and recreate the user.
          </div>
        )}
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>
          {isEdit ? 'Save Changes' : 'Create User'}
        </Button>
      </ModalActions>
    </Modal>
  );
}
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, ModalGrid, ModalActions } from '@/components/ui/index';
import styles from './LawFirms.module.css';
import tableStyles from '@/styles/table.module.css';

const EMPTY_FORM = { firm_name: '', firm_phone: '', email: '', address: '', notes: '' };

export function LawFirms() {
  const toast   = useAppToast();
  const [firms,   setFirms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState({ open: false, data: null }); // data=null → create
  const dirtyRows = useRef(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('law_firm')
      .select('*')
      .order('ID_number');
    if (error) { toast('❌ ' + error.message, 'error'); }
    else setFirms(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => setModal({ open: true, data: null });
  const openEdit   = firm => setModal({ open: true, data: firm });
  const closeModal = () => setModal({ open: false, data: null });

  const handleSave = async (btn, row) => {
    const id = row.dataset.id;
    const payload = {};
    row.querySelectorAll('[data-field]').forEach(el => {
      payload[el.dataset.field] = el.innerText.trim();
    });
    if (!payload.firm_name) { toast('⚠️ Firm Name is required', 'warning'); return; }
    btn.classList.remove(tableStyles.dirty);
    btn.textContent = '…';
    const { error } = await supabase.from('law_firm').update(payload).eq('ID_number', id);
    if (error) { toast('❌ ' + error.message, 'error'); btn.textContent = 'Save'; return; }
    toast('✓ Firm saved');
    btn.textContent = '✓';
    btn.style.background = 'var(--success)';
    dirtyRows.current.delete(id);
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('law_firm').delete().eq('ID_number', id);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ Firm deleted');
    load();
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Law Firms</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${firms.length} firms`}</p>
        </div>
        <Button variant="dark" onClick={openCreate}>+ New Firm</Button>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th className={tableStyles.stickyCol}>ID</th>
              <th>Firm Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Notes</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={7}>Loading firms…</td>
              </tr>
            )}
            {!loading && firms.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={7}>No law firms yet. Add one with + New Firm.</td>
              </tr>
            )}
            {!loading && firms.map(f => (
              <tr key={f.ID_number} data-id={f.ID_number}
                onClick={e => { if (e.target.closest('button,a,[contenteditable]')) return; }}
              >
                <td className={tableStyles.stickyCol}
                  onClick={e => e.currentTarget.closest('tr').classList.toggle(tableStyles.selected)}>
                  {f.ID_number}
                </td>
                <td><div className={`${tableStyles.editable} ${tableStyles.bold}`}
                  contentEditable suppressContentEditableWarning
                  data-field="firm_name"
                  onInput={e => {
                    const row = e.target.closest('tr');
                    const btn = row.querySelector('.' + tableStyles.saveBtn);
                    btn?.classList.add(tableStyles.dirty);
                  }}>{f.firm_name}</div></td>
                <td><div className={tableStyles.editable} contentEditable suppressContentEditableWarning data-field="firm_phone"
                  onInput={e => e.target.closest('tr').querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty)}
                  >{f.firm_phone}</div></td>
                <td><div className={tableStyles.editable} contentEditable suppressContentEditableWarning data-field="email"
                  onInput={e => e.target.closest('tr').querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty)}
                  >{f.email}</div></td>
                <td><div className={`${tableStyles.editable} ${tableStyles.wide}`} contentEditable suppressContentEditableWarning data-field="address"
                  onInput={e => e.target.closest('tr').querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty)}
                  >{f.address}</div></td>
                <td><div className={`${tableStyles.editable} ${tableStyles.wide}`} contentEditable suppressContentEditableWarning data-field="notes"
                  onInput={e => e.target.closest('tr').querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty)}
                  >{f.notes}</div></td>
                <td className={tableStyles.actCol}>
                  <div style={{ display:'flex', gap:'6px', justifyContent:'center' }}>
                    <button className={tableStyles.saveBtn}
                      onClick={e => handleSave(e.currentTarget, e.currentTarget.closest('tr'))}>
                      Save
                    </button>
                    <button className={tableStyles.deleteBtn}
                      onClick={() => handleDelete(f.ID_number, f.firm_name)}>
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LawFirmModal
        open={modal.open}
        initial={modal.data}
        onClose={closeModal}
        onSaved={() => { closeModal(); load(); }}
      />
    </div>
  );
}

/* ── Modal create/edit ── */
function LawFirmModal({ open, initial, onClose, onSaved }) {
  const toast = useAppToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? {
      firm_name:  initial.firm_name  || '',
      firm_phone: initial.firm_phone || '',
      email:      initial.email      || '',
      address:    initial.address    || '',
      notes:      initial.notes      || '',
    } : EMPTY_FORM);
  }, [initial, open]);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    if (!form.firm_name.trim()) { toast('⚠️ Firm Name is required', 'warning'); return; }
    setSaving(true);
    const payload = { ...form };
    const { error } = initial
      ? await supabase.from('law_firm').update(payload).eq('ID_number', initial.ID_number)
      : await supabase.from('law_firm').insert(payload);
    setSaving(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast(initial ? '✓ Firm updated' : '✓ Firm created');
    onSaved();
  };

  return (
    <Modal open={open} title={initial ? 'Edit Law Firm' : 'New Law Firm'} onClose={onClose}>
      <ModalGrid>
        <Field label="Firm Name *" className="full">
          <Input value={form.firm_name} onChange={set('firm_name')} placeholder="Telare Law PLLC" />
        </Field>
        <Field label="Phone">
          <Input value={form.firm_phone} onChange={set('firm_phone')} placeholder="+1 555 000 0000" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set('email')} placeholder="contact@firm.com" />
        </Field>
        <Field label="Address" className="full">
          <Input value={form.address} onChange={set('address')} placeholder="123 Main St, Las Vegas, NV" />
        </Field>
        <Field label="Notes" className="full">
          <Input value={form.notes} onChange={set('notes')} placeholder="Additional notes…" />
        </Field>
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>
          {initial ? 'Save Changes' : 'Create Firm'}
        </Button>
      </ModalActions>
    </Modal>
  );
}

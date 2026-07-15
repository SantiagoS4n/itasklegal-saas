import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, ModalGrid, ModalActions, SortableTh } from '@/components/ui/index';
import { useSort } from '@/hooks/useSort';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import tableStyles from '@/styles/table.module.css';
import { dirtyStore } from '@/context/DirtyContext';
import { exportToCSV } from '@/utils/exportCSV';
import styles from './LawFirms.module.css';

const EMPTY = { firm_name: '', firm_phone: '', email: '', address: '', notes: '' };

export function LawFirms() {
  const toast   = useAppToast();
  const [firms,   setFirms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState({ open: false, data: null });

  const { sorted, toggle, icon } = useSort(firms, 'firm_name', 'asc');
  const pagination = usePagination(sorted, 25);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('law_firm').select('*').order('firm_name');
    if (error) toast('❌ ' + error.message, 'error');
    else setFirms(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (btn, row) => {
    const id = row.dataset.id;
    const payload = {};
    row.querySelectorAll('[data-field]').forEach(el => {
      payload[el.dataset.field] = el.innerText.trim();
    });
    if (!payload.firm_name) { toast('⚠️ Firm Name is required', 'warning'); return; }
    btn.classList.remove(tableStyles.dirty); btn.textContent = '…';
    const { error } = await supabase.from('law_firm').update(payload).eq('ID_number', id);
    if (error) { toast('❌ ' + error.message, 'error'); btn.textContent = 'Save'; return; }
    toast('✓ Firm saved'); dirtyStore.remove('firm-' + id);
    btn.textContent = '✓'; btn.style.background = 'var(--success)';
    setFirms(prev => prev.map(f => String(f.ID_number) === String(id) ? { ...f, ...payload } : f));
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from('law_firm').delete().eq('ID_number', id);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ Firm deleted'); load();
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Law Firms</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${firms.length} firms`}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => exportToCSV(
            sorted,
            [
              { key: 'ID_number', label: 'ID' },
              { key: 'firm_name', label: 'Firm Name' },
              { key: 'firm_phone', label: 'Phone' },
              { key: 'email', label: 'Email' },
              { key: 'address', label: 'Address' },
              { key: 'notes', label: 'Notes' },
            ],
            'law_firms'
          )}>
            ⬇ Export
          </Button>
          <Button variant="dark" onClick={() => setModal({ open: true, data: null })}>+ New Firm</Button>
        </div>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <SortableTh sortKey="ID_number" icon={icon} onToggle={toggle} className={tableStyles.stickyCol}>ID</SortableTh>
              <SortableTh sortKey="firm_name"  icon={icon} onToggle={toggle}>Firm Name</SortableTh>
              <SortableTh sortKey="firm_phone" icon={icon} onToggle={toggle}>Phone</SortableTh>
              <SortableTh sortKey="email"      icon={icon} onToggle={toggle}>Email</SortableTh>
              <SortableTh sortKey="address"    icon={icon} onToggle={toggle}>Address</SortableTh>
              <SortableTh sortKey="notes"      icon={icon} onToggle={toggle}>Notes</SortableTh>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={8} cols={7} />}
            {!loading && sorted.length === 0 && <tr className={tableStyles.stateRow}><td colSpan={7}>No law firms yet.</td></tr>}
            {!loading && pagination.paginated.map(f => (
              <tr key={f.ID_number} data-id={f.ID_number}>
                <td className={tableStyles.stickyCol}
                  onClick={e => e.currentTarget.closest('tr').classList.toggle(tableStyles.selected)}>
                  {f.ID_number}
                </td>
                <td><div className={`${tableStyles.editable} ${tableStyles.bold}`} contentEditable suppressContentEditableWarning data-field="firm_name" onInput={e => { const r = e.target.closest('tr'); r.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty); dirtyStore.add('firm-' + r.dataset.id); }}>{f.firm_name||''}</div></td>
                <td><div className={tableStyles.editable} contentEditable suppressContentEditableWarning data-field="firm_phone" onInput={e => { const r = e.target.closest('tr'); r.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty); dirtyStore.add('firm-' + r.dataset.id); }}>{f.firm_phone||''}</div></td>
                <td><div className={tableStyles.editable} contentEditable suppressContentEditableWarning data-field="email" onInput={e => { const r = e.target.closest('tr'); r.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty); dirtyStore.add('firm-' + r.dataset.id); }}>{f.email||''}</div></td>
                <td><div className={`${tableStyles.editable} ${tableStyles.wide}`} contentEditable suppressContentEditableWarning data-field="address" onInput={e => { const r = e.target.closest('tr'); r.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty); dirtyStore.add('firm-' + r.dataset.id); }}>{f.address||''}</div></td>
                <td><div className={`${tableStyles.editable} ${tableStyles.wide}`} contentEditable suppressContentEditableWarning data-field="notes" onInput={e => { const r = e.target.closest('tr'); r.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty); dirtyStore.add('firm-' + r.dataset.id); }}>{f.notes||''}</div></td>
                <td className={tableStyles.actCol}>
                  <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                    <button className={tableStyles.saveBtn} onClick={e => handleSave(e.currentTarget, e.currentTarget.closest('tr'))}>Save</button>
                    <button className={tableStyles.deleteBtn} onClick={() => handleDelete(f.ID_number, f.firm_name)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} />

      <LawFirmModal open={modal.open} initial={modal.data} onClose={() => setModal({ open: false, data: null })} onSaved={() => { setModal({ open: false, data: null }); load(); }} />
    </div>
  );
}

function LawFirmModal({ open, initial, onClose, onSaved }) {
  const toast = useAppToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? { firm_name: initial.firm_name||'', firm_phone: initial.firm_phone||'', email: initial.email||'', address: initial.address||'', notes: initial.notes||'' } : EMPTY);
  }, [initial, open]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async () => {
    if (!form.firm_name.trim()) { toast('⚠️ Firm Name is required', 'warning'); return; }
    setSaving(true);
    const { error } = initial
      ? await supabase.from('law_firm').update(form).eq('ID_number', initial.ID_number)
      : await supabase.from('law_firm').insert(form);
    setSaving(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast(initial ? '✓ Firm updated' : '✓ Firm created');
    onSaved();
  };

  return (
    <Modal open={open} title={initial ? 'Edit Law Firm' : 'New Law Firm'} onClose={onClose}>
      <ModalGrid>
        <Field label="Firm Name *" className="full"><Input value={form.firm_name} onChange={set('firm_name')} placeholder="Telare Law PLLC" /></Field>
        <Field label="Phone"><Input value={form.firm_phone} onChange={set('firm_phone')} placeholder="+1 555 000 0000" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} placeholder="contact@firm.com" /></Field>
        <Field label="Address" className="full"><Input value={form.address} onChange={set('address')} placeholder="123 Main St" /></Field>
        <Field label="Notes" className="full"><Input value={form.notes} onChange={set('notes')} placeholder="Additional notes…" /></Field>
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>{initial ? 'Save Changes' : 'Create Firm'}</Button>
      </ModalActions>
    </Modal>
  );
}

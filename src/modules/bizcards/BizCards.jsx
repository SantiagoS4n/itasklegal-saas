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
import styles from './BizCards.module.css';

const EMPTY = { full_name:'', company:'', job_title:'', email:'', phone_office:'', phone_fax:'', website:'', address:'', city:'', state:'', country:'', notes:'', source_file:'' };

export function BizCards() {
  const toast = useAppToast();
  const [cards,   setCards]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState({ open: false, data: null });
  const [search,  setSearch]  = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('bussines_card').select('*').order('ID');
    if (error) toast('❌ ' + error.message, 'error');
    else setCards(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = cards.filter(c => {
    const q = search.toLowerCase();
    return !q || (c.full_name||'').toLowerCase().includes(q) || (c.company||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.job_title||'').toLowerCase().includes(q);
  });

  const { sorted, toggle, icon } = useSort(filtered, 'full_name', 'asc');
  const pagination = usePagination(sorted, 25);

  const handleSave = async (btn, row) => {
    const id = row.dataset.id;
    const payload = {};
    row.querySelectorAll('[data-field]').forEach(el => { payload[el.dataset.field] = el.innerText.trim() || null; });
    if (!payload.full_name) { toast('⚠️ Name is required', 'warning'); return; }
    btn.classList.remove(tableStyles.dirty); btn.textContent = '…';
    const { error } = await supabase.from('bussines_card').update(payload).eq('ID', id);
    if (error) { toast('❌ ' + error.message, 'error'); btn.textContent = 'Save'; return; }
    toast('✓ Card saved'); dirtyStore.remove('card-' + id);
    btn.textContent = '✓'; btn.style.background = 'var(--success)';
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from('bussines_card').delete().eq('ID', id);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ Card deleted'); load();
  };

  const markDirty = el => { const r = el.closest('tr'); if (!r) return; r.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty); dirtyStore.add('card-' + r.dataset.id); };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Business Cards</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${sorted.length} contacts`}</p>
        </div>
        <div className={styles.actions}>
          <input className={styles.search} type="text" placeholder="🔍  Search name, company, email…" value={search} onChange={e => setSearch(e.target.value)} />
          <Button variant="ghost" onClick={() => exportToCSV(
            sorted,
            [
              { key: 'full_name', label: 'Name' },
              { key: 'company', label: 'Company' },
              { key: 'job_title', label: 'Job Title' },
              { key: 'email', label: 'Email' },
              { key: 'phone_office', label: 'Phone Office' },
              { key: 'phone_fax', label: 'Phone Fax' },
              { key: 'website', label: 'Website' },
              { key: 'city', label: 'City' },
              { key: 'state', label: 'State' },
              { key: 'country', label: 'Country' },
              { key: 'address', label: 'Address' },
              { key: 'notes', label: 'Notes' },
            ],
            'business_cards'
          )}>
            ⬇ Export
          </Button>
          <Button variant="dark" onClick={() => setModal({ open: true, data: null })}>+ New Card</Button>
        </div>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} style={{ minWidth: 1600 }}>
          <thead>
            <tr>
              <SortableTh sortKey="ID"           icon={icon} onToggle={toggle} className={tableStyles.stickyCol}>ID</SortableTh>
              <SortableTh sortKey="full_name"    icon={icon} onToggle={toggle}>Name</SortableTh>
              <SortableTh sortKey="company"      icon={icon} onToggle={toggle}>Company</SortableTh>
              <SortableTh sortKey="job_title"    icon={icon} onToggle={toggle}>Job Title</SortableTh>
              <SortableTh sortKey="email"        icon={icon} onToggle={toggle}>Email</SortableTh>
              <SortableTh sortKey="phone_office" icon={icon} onToggle={toggle}>Phone Office</SortableTh>
              <th>Phone Fax</th>
              <th>Website</th>
              <SortableTh sortKey="city"         icon={icon} onToggle={toggle}>City</SortableTh>
              <SortableTh sortKey="state"        icon={icon} onToggle={toggle}>State</SortableTh>
              <SortableTh sortKey="country"      icon={icon} onToggle={toggle}>Country</SortableTh>
              <th>Address</th>
              <th>Notes</th>
              <th>Source File</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={8} cols={15} />}
            {!loading && sorted.length === 0 && <tr className={tableStyles.stateRow}><td colSpan={15}>{search ? 'No results.' : 'No cards yet.'}</td></tr>}
            {!loading {!loading && sorted.map(c =>{!loading && sorted.map(c => pagination.paginated.map(c => (
              <tr key={c.ID} data-id={c.ID}>
                <td className={tableStyles.stickyCol} onClick={e => e.currentTarget.closest('tr').classList.toggle(tableStyles.selected)}>{c.ID}</td>
                {['full_name','company','job_title','email','phone_office','phone_fax','website','city','state','country','address','notes','source_file'].map(f => (
                  <td key={f}>
                    <div className={`${tableStyles.editable} ${f === 'full_name' ? tableStyles.bold : ''} ${['address','notes'].includes(f) ? tableStyles.wide : ''}`}
                      contentEditable suppressContentEditableWarning data-field={f}
                      onInput={e => markDirty(e.target)}>
                      {c[f] ?? ''}
                    </div>
                  </td>
                ))}
                <td className={tableStyles.actCol}>
                  <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                    <button className={tableStyles.saveBtn} onClick={e => handleSave(e.currentTarget, e.currentTarget.closest('tr'))}>Save</button>
                    <button className={tableStyles.deleteBtn} onClick={() => handleDelete(c.ID, c.full_name)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} />

      <BizCardModal open={modal.open} initial={modal.data} onClose={() => setModal({ open: false, data: null })} onSaved={() => { setModal({ open: false, data: null }); load(); }} />
    </div>
  );
}

function BizCardModal({ open, initial, onClose, onSaved }) {
  const toast = useAppToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? Object.fromEntries(Object.keys(EMPTY).map(k => [k, initial[k]||''])) : EMPTY);
  }, [initial, open]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async () => {
    if (!form.full_name.trim()) { toast('⚠️ Name is required', 'warning'); return; }
    setSaving(true);
    const payload = Object.fromEntries(Object.entries(form).map(([k,v]) => [k, v.trim()||null]));
    const { error } = initial
      ? await supabase.from('bussines_card').update(payload).eq('ID', initial.ID)
      : await supabase.from('bussines_card').insert(payload);
    setSaving(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast(initial ? '✓ Card updated' : '✓ Card created');
    onSaved();
  };

  return (
    <Modal open={open} title={initial ? 'Edit Business Card' : 'New Business Card'} onClose={onClose} maxWidth={560}>
      <ModalGrid>
        <Field label="Full Name *" className="full"><Input value={form.full_name} onChange={set('full_name')} placeholder="John Smith" /></Field>
        <Field label="Company"><Input value={form.company} onChange={set('company')} placeholder="Acme Corp" /></Field>
        <Field label="Job Title"><Input value={form.job_title} onChange={set('job_title')} placeholder="CEO" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} placeholder="john@acme.com" /></Field>
        <Field label="Phone Office"><Input value={form.phone_office} onChange={set('phone_office')} placeholder="+1 555 000 0000" /></Field>
        <Field label="Phone Fax"><Input value={form.phone_fax} onChange={set('phone_fax')} placeholder="+1 555 000 0001" /></Field>
        <Field label="Website" className="full"><Input value={form.website} onChange={set('website')} placeholder="https://acme.com" /></Field>
        <Field label="City"><Input value={form.city} onChange={set('city')} placeholder="Las Vegas" /></Field>
        <Field label="State"><Input value={form.state} onChange={set('state')} placeholder="NV" /></Field>
        <Field label="Country"><Input value={form.country} onChange={set('country')} placeholder="USA" /></Field>
        <Field label="Address" className="full"><Input value={form.address} onChange={set('address')} placeholder="123 Main St" /></Field>
        <Field label="Notes" className="full"><Input value={form.notes} onChange={set('notes')} placeholder="Met at conference…" /></Field>
        <Field label="Source File" className="full"><Input value={form.source_file} onChange={set('source_file')} placeholder="scan_001.jpg" /></Field>
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>{initial ? 'Save Changes' : 'Create Card'}</Button>
      </ModalActions>
    </Modal>
  );
}

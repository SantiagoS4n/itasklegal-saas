import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, ModalGrid, ModalActions, SortableTh } from '@/components/ui/index';
import { useSort } from '@/hooks/useSort';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import tableStyles from '@/styles/table.module.css';
import { dirtyStore } from '@/context/DirtyContext';
import { exportToCSV } from '@/utils/exportCSV';
import { CreateFirmUserModal } from '@/modules/bizcards/CreateFirmUserModal';
import styles from './BizCards.module.css';

const EMPTY = { full_name:'', company:'', job_title:'', email:'', phone_office:'', phone_fax:'', website:'', address:'', city:'', state:'', country:'', notes:'', source_file:'' };

const markDirty = el => { const r = el.closest('tr'); if (!r) return; r.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty); dirtyStore.add('card-' + r.dataset.id); };

export function BizCards() {
  const toast = useAppToast();
  const [cards,   setCards]   = useState([]);
  const [firms,   setFirms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState({ open: false, data: null });
  const [firmModal, setFirmModal] = useState({ open: false, card: null });
  const [search,  setSearch]  = useState('');

  const load = async () => {
    setLoading(true);
    const [cardsRes, firmsRes] = await Promise.all([
      supabase.from('bussinescard').select('*, law_firm(firm_name)').order('ID'),
      supabase.from('law_firm').select('ID_number, firm_name').order('firm_name'),
    ]);
    if (cardsRes.error) toast('❌ ' + cardsRes.error.message, 'error');
    else setCards(cardsRes.data);
    if (!firmsRes.error) setFirms(firmsRes.data);
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
    row.querySelectorAll('[data-field]').forEach(el => {
      const val = el.value !== undefined ? el.value : el.innerText.trim();
      payload[el.dataset.field] = val || null;
    });
    if (!payload.full_name) { toast('⚠️ Name is required', 'warning'); return; }
    btn.classList.remove(tableStyles.dirty); btn.textContent = '…';
    const { error } = await supabase.from('bussinescard').update(payload).eq('ID', id);
    if (error) { toast('❌ ' + error.message, 'error'); btn.textContent = 'Save'; return; }
    toast('✓ Card saved'); dirtyStore.remove('card-' + id);
    btn.textContent = '✓'; btn.style.background = 'var(--success)';
    setCards(prev => prev.map(c => {
      if (String(c.ID) !== String(id)) return c;
      const updated = { ...c, ...payload };
      const firm = firms.find(f => String(f.ID_number) === String(payload.firm_id));
      updated.law_firm = firm ? { firm_name: firm.firm_name } : null;
      return updated;
    }));
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);
  };

  const handleDelete = async (card) => {
    const cardId = card.ID ?? card.id;
    if (cardId === null || cardId === undefined) {
      toast('❌ Cannot delete: this card has no ID', 'error');
      return;
    }
    const label = card.full_name ? `"${card.full_name}" (card #${cardId})` : `card #${cardId}`;
    if (!confirm(`Delete ${label}?`)) return;

    const { data, error } = await supabase.from('bussinescard').delete().eq('ID', cardId).select();
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    if (!data || data.length === 0) {
      toast('⚠️ Nothing was deleted — check RLS policy or ID', 'warning');
      return;
    }
    toast('✓ Card deleted');
    load();
  };

  // Abre el modal combinado (crea Law Firm + usuario de portal)
  const openCreateFirmFromCard = (card) => {
    setFirmModal({ open: true, card });
  };

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
              { key: 'law_firm.firm_name', label: 'Linked Firm' },
            ],
            'business_cards'
          )}>
            ⬇ Export
          </Button>
          <Button variant="dark" onClick={() => setModal({ open: true, data: null })}>+ New Card</Button>
        </div>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} style={{ minWidth: 1750 }}>
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
              <SortableTh sortKey="law_firm.firm_name" icon={icon} onToggle={toggle}>Linked Firm</SortableTh>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={8} cols={16} />}
            {!loading && sorted.length === 0 && <tr className={tableStyles.stateRow}><td colSpan={16}>{search ? 'No results.' : 'No cards yet.'}</td></tr>}
            {!loading && pagination.paginated.map(c => (
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
                {/* Linked Firm — dropdown de asignación */}
                <td>
                  <select
                    className={tableStyles.selInput}
                    data-field="firm_id"
                    defaultValue={c.firm_id || ''}
                    onChange={e => markDirty(e.target)}
                  >
                    <option value="">— Unlinked —</option>
                    {firms.map(f => (
                      <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>
                    ))}
                  </select>
                </td>
                <td className={tableStyles.actCol}>
                  <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                    <button className={tableStyles.saveBtn} onClick={e => handleSave(e.currentTarget, e.currentTarget.closest('tr'))}>Save</button>
                    {!c.firm_id && (
                      <button className={styles.createFirmBtn} onClick={() => openCreateFirmFromCard(c)} title="Create firm / portal login">
                        🔑
                      </button>
                    )}
                    <button className={tableStyles.deleteBtn} onClick={() => handleDelete(c)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} />

      <BizCardModal open={modal.open} initial={modal.data} onClose={() => setModal({ open: false, data: null })} onSaved={() => { setModal({ open: false, data: null }); load(); }} />

      {/* Modal combinado: crea Law Firm + usuario de portal, y vincula la card */}
      <CreateFirmUserModal
        open={firmModal.open}
        card={firmModal.card}
        firms={firms}
        toast={toast}
        onClose={() => setFirmModal({ open: false, card: null })}
        onDone={() => { setFirmModal({ open: false, card: null }); load(); }}
      />
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
      ? await supabase.from('bussinescard').update(payload).eq('ID', initial.ID)
      : await supabase.from('bussinescard').insert(payload);
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

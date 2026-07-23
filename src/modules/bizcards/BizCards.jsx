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
import { exportToCSV } from '@/utils/exportCSV';
import { CreateFirmUserModal } from '@/modules/bizcards/CreateFirmUserModal';
import styles from './BizCards.module.css';

const EMPTY = { full_name:'', company:'', job_title:'', email:'', phone_office:'', phone_fax:'', website:'', address:'', city:'', state:'', country:'', notes:'', source_file:'' };

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
        <table className={tableStyles.table} style={{ minWidth: 1650 }}>
          <thead>
            <tr>
              <SortableTh sortKey="ID"           icon={icon} onToggle={toggle} className={tableStyles.stickyCol}>ID</SortableTh>
              <SortableTh sortKey="full_name"    icon={icon} onToggle={toggle}>Name</SortableTh>
              <SortableTh sortKey="company"      icon={icon} onToggle={toggle}>Company</SortableTh>
              <SortableTh sortKey="job_title"    icon={icon} onToggle={toggle}>Job Title</SortableTh>
              <SortableTh sortKey="email"        icon={icon} onToggle={toggle}>Email</SortableTh>
              <SortableTh sortKey="phone_office" icon={icon} onToggle={toggle}>Phone Office</SortableTh>
              <th>Website</th>
              <SortableTh sortKey="city"         icon={icon} onToggle={toggle}>City</SortableTh>
              <SortableTh sortKey="country"      icon={icon} onToggle={toggle}>Country</SortableTh>
              <th>Notes</th>
              <SortableTh sortKey="law_firm.firm_name" icon={icon} onToggle={toggle}>Linked Firm</SortableTh>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={8} cols={12} />}
            {!loading && sorted.length === 0 && <tr className={tableStyles.stateRow}><td colSpan={12}>{search ? 'No results.' : 'No cards yet.'}</td></tr>}
            {!loading && pagination.paginated.map(c => (
              <tr key={c.ID}>
                <td className={tableStyles.stickyCol}>{c.ID}</td>
                <td className={tableStyles.bold} style={{ padding: '10px 8px' }}>{c.full_name || '—'}</td>
                <td>{c.company || '—'}</td>
                <td>{c.job_title || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c.phone_office || '—'}</td>
                <td>{c.website || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>{c.country || '—'}</td>
                <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes || '—'}</td>
                <td>{c.law_firm?.firm_name || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                <td className={tableStyles.actCol}>
                  <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                    <button className={styles.editBtn} onClick={() => setModal({ open: true, data: c })}>Edit</button>
                    {c.firm_id
                      ? <span className={styles.linkedBadge} title="Already has portal access">✓</span>
                      : <button className={styles.createFirmBtn} onClick={() => setFirmModal({ open: true, card: c })} title="Portal access">🔑</button>
                    }
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
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>{initial ? 'Save Changes' : 'Create Card'}</Button>
      </ModalActions>
    </Modal>
  );
}
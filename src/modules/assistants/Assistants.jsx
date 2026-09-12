import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, ModalGrid, ModalActions, SortableTh } from '@/components/ui/index';
import FormattedNumberInput from '@/components/ui/FormattedNumberInput';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { fmtMoney, safeUrl } from '@/utils/format';
import { exportToCSV } from '@/utils/exportCSV';
import { useSort } from '@/hooks/useSort';
import { usePagination } from '@/hooks/usePagination';
import tableStyles from '@/styles/table.module.css';
import styles from './Assistants.module.css';

const EMPTY = {
  name: '', lastName: '', Id_document: '', phone: '', email: '',
  city: '', date_of_birth: '', role: '', firm_id: '',
  start_date: '', Invoice_amount: '', pay_cop: '', pay_usd: '',
  hour: '', contracted: 'No', refer_by: '', notes: '',
};

const ROLE_CLASS = {
  'Paralegal':         tableStyles.roleParalegal,
  'Virtual Assistant': tableStyles.roleVA,
  'Case Manager':      tableStyles.roleCM,
};

export function Assistants() {
  const toast = useAppToast();
  const [all,        setAll]        = useState([]);
  const [firms,      setFirms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('active');
  const [firmFilter, setFirmFilter] = useState('');
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState({ open: false, data: null });

  const load = async () => {
    setLoading(true);
    const [asRes, fmRes] = await Promise.all([
      supabase.from('assistant').select('*, law_firm(firm_name)').order('full_name'),
      supabase.from('law_firm').select('ID_number, firm_name').order('firm_name'),
    ]);
    if (asRes.error) toast('❌ ' + asRes.error.message, 'error');
    else setAll(asRes.data);
    if (!fmRes.error) setFirms(fmRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // 1. Separar por tab
  const active   = all.filter(a => a.contracted === 'Yes');
  const pipeline = all.filter(a => a.contracted !== 'Yes');
  const byTab    = tab === 'active' ? active : pipeline;

  // 2. Filtrar por firma (solo active)
  const byFirm = tab === 'active' && firmFilter
    ? byTab.filter(a => String(a.firm_id) === firmFilter)
    : byTab;

  // 3. Filtrar por búsqueda
  const searched = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return byFirm;
    return byFirm.filter(a =>
      (a.full_name          || '').toLowerCase().includes(q) ||
      (a.email              || '').toLowerCase().includes(q) ||
      (a.phone              || '').toLowerCase().includes(q) ||
      (a.WA                 || '').toLowerCase().includes(q) ||
      (a.city               || '').toLowerCase().includes(q) ||
      (a.role               || '').toLowerCase().includes(q) ||
      (a.Id_document        || '').toLowerCase().includes(q) ||
      (a.law_firm?.firm_name|| '').toLowerCase().includes(q)
    );
  }, [byFirm, search]);

  // 4. Ordenar por columna
  const { sorted, toggle, icon } = useSort(searched, 'ID', 'desc');

  // 4. Paginación
  const pagination = usePagination(sorted, 25);

  // Barra de scroll horizontal fija abajo, para no tener que bajar hasta el
  // final de la tabla solo para moverse a los lados (mouse sin trackpad).
  const tableWrapRef  = useRef(null);
  const stickyBarRef  = useRef(null);
  const stickySpacerRef = useRef(null);

  useEffect(() => {
    const tableWrap = tableWrapRef.current;
    const stickyBar = stickyBarRef.current;
    const spacer    = stickySpacerRef.current;
    if (!tableWrap || !stickyBar || !spacer) return;

    const matchWidth = () => { spacer.style.width = tableWrap.scrollWidth + 'px'; };
    matchWidth();

    // rAF-throttled: escribir scrollLeft en cada evento de scroll (que dispara
    // muy seguido) causaba un lag notorio; con esto se agrupa por frame.
    let rafId = null;
    const fromTable = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        stickyBar.scrollLeft = tableWrap.scrollLeft;
        rafId = null;
      });
    };
    const fromBar = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        tableWrap.scrollLeft = stickyBar.scrollLeft;
        rafId = null;
      });
    };

    tableWrap.addEventListener('scroll', fromTable, { passive: true });
    stickyBar.addEventListener('scroll', fromBar, { passive: true });
    const ro = new ResizeObserver(matchWidth);
    ro.observe(tableWrap);

    return () => {
      tableWrap.removeEventListener('scroll', fromTable);
      stickyBar.removeEventListener('scroll', fromBar);
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [loading, pagination.paginated]);

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assistants</h1>
          <p className={styles.count}>
            {loading ? 'Loading…' : `${active.length} active · ${pipeline.length} candidates`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <input
            className={styles.search}
            type="text"
            placeholder="🔍  Search name, email, city, role, firm…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button variant="ghost" onClick={() => exportToCSV(
            searched,
            [
              { key: 'ID', label: 'ID' },
              { key: 'Id_document', label: 'Document' },
              { key: 'full_name', label: 'Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'WA', label: 'WA' },
              { key: 'email', label: 'Email' },
              { key: 'city', label: 'City' },
              { key: 'role', label: 'Role' },
              { key: 'law_firm.firm_name', label: 'Firm' },
              { key: 'Invoice_amount', label: 'Invoice Amount' },
              { key: 'pay_cop', label: 'Pay COP' },
              { key: 'pay_usd', label: 'Pay USD' },
              { key: 'start_date', label: 'Start Date' },
              { key: 'hour', label: 'Hours' },
              { key: 'contracted', label: 'Contracted' },
              { key: 'refer_by', label: 'Referred By' },
            ],
            `assistants_${tab}`
          )}>
            ⬇ Export
          </Button>
          <Button variant="dark" onClick={() => setModal({ open: true, data: null })}>
            + New Assistant
          </Button>
        </div>
      </div>

      {/* Tabs + filtro firma */}
      <div className={styles.tabRow}>
        <button
          className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`}
          onClick={() => { setTab('active'); setSearch(''); }}>
          ✅ Active
          <span className={styles.tabCount}>{active.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'pipeline' ? styles.tabActive : ''}`}
          onClick={() => { setTab('pipeline'); setSearch(''); setFirmFilter(''); }}>
          🔄 Candidates
          <span className={styles.tabCount}>{pipeline.length}</span>
        </button>
        {tab === 'active' && (
          <select className={styles.firmFilter} value={firmFilter} onChange={e => setFirmFilter(e.target.value)}>
            <option value="">All Firms</option>
            {firms.map(f => <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>)}
          </select>
        )}
        {search && (
          <span className={styles.searchBadge}>
            {searched.length} result{searched.length !== 1 ? 's' : ''} for "{search}"
            <button onClick={() => setSearch('')}>✕</button>
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className={`${tableStyles.tableWrap} ${styles.hideNativeScroll}`} ref={tableWrapRef}>
        <table className={tableStyles.table} style={{ minWidth: 2200 }}>
          <thead>
            <tr>
              <SortableTh sortKey="ID"            icon={icon} onToggle={toggle} className={tableStyles.stickyCol}>ID</SortableTh>
              <SortableTh sortKey="Id_document"   icon={icon} onToggle={toggle}>Document</SortableTh>
              <SortableTh sortKey="full_name"     icon={icon} onToggle={toggle}>Name</SortableTh>
              <SortableTh sortKey="phone"         icon={icon} onToggle={toggle}>Phone</SortableTh>
              <SortableTh sortKey="WA"            icon={icon} onToggle={toggle}>WA</SortableTh>
              <SortableTh sortKey="email"         icon={icon} onToggle={toggle}>Email</SortableTh>
              <SortableTh sortKey="date_of_birth" icon={icon} onToggle={toggle}>Birth Date</SortableTh>
              <SortableTh sortKey="city"          icon={icon} onToggle={toggle}>City</SortableTh>
              <SortableTh sortKey="role"          icon={icon} onToggle={toggle}>Role</SortableTh>
              <th style={{ textAlign: 'center' }}>CV</th>
              <SortableTh sortKey="Invoice_amount" icon={icon} onToggle={toggle}>Inv. Amt</SortableTh>
              <SortableTh sortKey="pay_cop"       icon={icon} onToggle={toggle}>COP</SortableTh>
              <SortableTh sortKey="pay_usd"       icon={icon} onToggle={toggle}>USD</SortableTh>
              <SortableTh sortKey="start_date"    icon={icon} onToggle={toggle}>Start Date</SortableTh>
              <SortableTh sortKey="law_firm.firm_name" icon={icon} onToggle={toggle}>Firm</SortableTh>
              <SortableTh sortKey="hour"          icon={icon} onToggle={toggle}>Hours</SortableTh>
              <th>Notes</th>
              <SortableTh sortKey="refer_by"      icon={icon} onToggle={toggle}>Referred By</SortableTh>
              <SortableTh sortKey="contracted"    icon={icon} onToggle={toggle}>Contracted</SortableTh>
              <th style={{ textAlign: 'center' }}>Firm Agr.</th>
              <th style={{ textAlign: 'center' }}>VA Agr.</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={8} cols={22} />}
            {!loading && searched.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={22}>
                  {search
                    ? `No results for "${search}"`
                    : tab === 'active' ? 'No active assistants yet.' : 'No candidates yet.'}
                </td>
              </tr>
            )}
            {!loading && pagination.paginated.map(a => {
              const cvUrl   = safeUrl(a.link_CV);
              const firmUrl = safeUrl(a.Firm_agreement);
              const vaUrl   = safeUrl(a.VA_agreement);
              const waUrl   = safeUrl(a.WA);
              return (
                <tr key={a.ID}>
                  <td className={tableStyles.stickyCol}>{a.ID}</td>
                  <td>{a.Id_document || '—'}</td>
                  <td className={tableStyles.bold}>{a.full_name || '—'}</td>
                  <td>{a.phone || '—'}</td>
                  <td className={tableStyles.linkCell}>
                    {waUrl
                      ? <a href={waUrl} target="_blank" rel="noreferrer" className={styles.waLink}>WA</a>
                      : <span className={tableStyles.noLink}>—</span>}
                  </td>
                  <td>{a.email || '—'}</td>
                  <td>{a.date_of_birth || '—'}</td>
                  <td>{a.city || '—'}</td>
                  <td>
                    {a.role
                      ? <span className={`${tableStyles.selInput} ${ROLE_CLASS[a.role] || ''}`} style={{ display: 'inline-block' }}>{a.role}</span>
                      : '—'}
                  </td>
                  <td className={tableStyles.linkCell}>
                    {cvUrl
                      ? <a href={cvUrl} target="_blank" rel="noreferrer">View CV</a>
                      : <span className={tableStyles.noLink}>—</span>}
                  </td>
                  <td>{fmtMoney(a.Invoice_amount) || '—'}</td>
                  <td>{fmtMoney(a.pay_cop) || '—'}</td>
                  <td>{fmtMoney(a.pay_usd) || '—'}</td>
                  <td>{a.start_date || '—'}</td>
                  <td>{a.law_firm?.firm_name || '—'}</td>
                  <td>{a.hour ?? '—'}</td>
                  <td className={tableStyles.wide}>{a.notes || '—'}</td>
                  <td>{a.refer_by || '—'}</td>
                  <td>
                    <span
                      className={`${tableStyles.selInput} ${a.contracted === 'Yes' ? tableStyles.contrYes : tableStyles.contrNo}`}
                      style={{ display: 'inline-block', minWidth: 75, textAlign: 'center' }}>
                      {a.contracted || 'No'}
                    </span>
                  </td>
                  <td className={tableStyles.linkCell}>
                    {firmUrl
                      ? <a href={firmUrl} target="_blank" rel="noreferrer">Firm Agr.</a>
                      : <span className={tableStyles.noLink}>—</span>}
                  </td>
                  <td className={tableStyles.linkCell}>
                    {vaUrl
                      ? <a href={vaUrl} target="_blank" rel="noreferrer">VA Agr.</a>
                      : <span className={tableStyles.noLink}>—</span>}
                  </td>
                  <td className={tableStyles.actCol}>
                    <button className={styles.editBtn} onClick={() => setModal({ open: true, data: a })}>
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.stickyHScroll} ref={stickyBarRef}>
        <div ref={stickySpacerRef} style={{ height: 1 }} />
      </div>

      <Pagination {...pagination} />

      <AssistantModal
        open={modal.open}
        initial={modal.data}
        firms={firms}
        onClose={() => setModal({ open: false, data: null })}
        onSaved={() => { setModal({ open: false, data: null }); load(); }}
      />
    </div>
  );
}

const REQUIRED_WHEN_CONTRACTED = [
  ['Id_document',    'Document ID'],
  ['email',          'Email'],
  ['phone',          'Phone'],
  ['role',           'Role'],
  ['start_date',     'Start Date'],
  ['Invoice_amount', 'Invoice Amount'],
  ['firm_id',        'Firm'],
  ['hour',           'Hours'],
];

function AssistantModal({ open, initial, firms, onClose, onSaved }) {
  const toast = useAppToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  // Campos obligatorios que faltan por llenar (solo aplica si Contracted = Yes)
  const missing = useMemo(() => {
    if (form.contracted !== 'Yes') return new Set();
    const s = new Set(REQUIRED_WHEN_CONTRACTED.filter(([f]) => !form[f]).map(([f]) => f));
    if (!form.pay_cop && !form.pay_usd) { s.add('pay_cop'); s.add('pay_usd'); }
    return s;
  }, [form]);
  const errStyle = f => missing.has(f) ? { borderColor: 'var(--danger)' } : undefined;
  const mark = (label, f) => missing.has(f) ? `${label} *` : label;

  useEffect(() => {
    if (!open) return;
    setForm(initial ? {
      name:           initial.name          || '',
      lastName:       initial.lastName      || '',
      Id_document:    initial.Id_document   || '',
      phone:          initial.phone         || '',
      email:          initial.email         || '',
      city:           initial.city          || '',
      date_of_birth:  initial.date_of_birth || '',
      role:           initial.role          || '',
      firm_id:        initial.firm_id       || '',
      start_date:     initial.start_date    || '',
      Invoice_amount: initial.Invoice_amount ?? '',
      pay_cop:        initial.pay_cop        ?? '',
      pay_usd:        initial.pay_usd        ?? '',
      hour:           initial.hour           ?? '',
      contracted:     initial.contracted    || 'No',
      refer_by:       initial.refer_by      || '',
      notes:          initial.notes         || '',
    } : EMPTY);
  }, [initial, open]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  const setNum = f => val => setForm(p => ({ ...p, [f]: val }));

  const submit = async () => {
    if (!form.name && !form.lastName) { toast('⚠️ Name is required', 'warning'); return; }

    if (missing.size > 0) {
      const labels = REQUIRED_WHEN_CONTRACTED.filter(([f]) => missing.has(f)).map(([, l]) => l);
      if (missing.has('pay_cop')) labels.push('Pay COP or Pay USD');
      toast(`⚠️ Required when contracted is Yes: ${labels.join(', ')}`, 'warning');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      full_name:      `${form.name} ${form.lastName}`.trim(),
      Id_document:    form.Id_document.replace(/[.,]/g, '') || null,
      firm_id:        form.firm_id        || null,
      date_of_birth:  form.date_of_birth  || null,
      start_date:     form.start_date     || null,
      Invoice_amount: parseFloat(form.Invoice_amount) || null,
      pay_cop:        parseFloat(form.pay_cop)        || null,
      pay_usd:        parseFloat(form.pay_usd)        || null,
      hour:           parseFloat(form.hour)           || null,
    };
    const { error } = initial
      ? await supabase.from('assistant').update(payload).eq('ID', initial.ID)
      : await supabase.from('assistant').insert(payload);
    setSaving(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast(initial ? '✓ Assistant updated' : '✓ Assistant created');

    // Si contracted pasó de No → Yes, disparar generación de agreement en n8n
    if (initial && payload.contracted === 'Yes' && initial.contracted !== 'Yes') {
      const agreementUrl = import.meta.env.VITE_N8N_AGREEMENT_WEBHOOK;
      if (agreementUrl) {
        fetch(agreementUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-token': import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',
          },
          body: JSON.stringify({
            assistant_id: initial.ID,
            full_name: payload.full_name,
            firm_id: payload.firm_id,
            triggered_at: new Date().toISOString(),
          }),
        })
          .then(res => {
            if (res.ok) toast('✓ Agreement generation triggered');
            else toast(`⚠️ Agreement webhook responded ${res.status}`, 'warning');
          })
          .catch(() => toast('⚠️ Could not reach agreement webhook', 'warning'));
      }
    }

    onSaved();
  };

  return (
    <Modal open={open} title={initial ? 'Edit Assistant' : 'New Assistant'} onClose={onClose} maxWidth={560}>
      {form.contracted === 'Yes' && missing.size > 0 && (
        <p style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600, margin: '0 0 8px' }}>
          ⚠️ Los campos marcados con * son obligatorios porque Contracted está en "Yes".
        </p>
      )}
      <ModalGrid>
        <div className={styles.sectionTitle}>Personal Info</div>
        <Field label="First Name *">
          <Input value={form.name} onChange={set('name')} placeholder="María" />
        </Field>
        <Field label="Last Name *">
          <Input value={form.lastName} onChange={set('lastName')} placeholder="García" />
        </Field>
        <Field label={mark('Document ID', 'Id_document')}>
          <Input value={form.Id_document} onChange={set('Id_document')} placeholder="CC 12345678" style={errStyle('Id_document')} />
        </Field>
        <Field label={mark('Phone', 'phone')}>
          <Input value={form.phone} onChange={set('phone')} placeholder="+57 300 000 0000" style={errStyle('phone')} />
        </Field>
        <Field label={mark('Email', 'email')} className="full">
          <Input type="email" value={form.email} onChange={set('email')} placeholder="maria@email.com" style={errStyle('email')} />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={set('city')} placeholder="Bogotá" />
        </Field>
        <Field label="Birth Date">
          <Input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
        </Field>

        <div className={styles.sectionTitle}>Employment</div>
        <Field label={mark('Role', 'role')}>
          <Select value={form.role} onChange={set('role')} style={errStyle('role')}>
            <option value="">— Select —</option>
            <option value="Paralegal">Paralegal</option>
            <option value="Virtual Assistant">Virtual Assistant</option>
            <option value="Case Manager">Case Manager</option>
          </Select>
        </Field>
        <Field label={mark('Law Firm', 'firm_id')}>
          <Select value={form.firm_id} onChange={set('firm_id')} style={errStyle('firm_id')}>
            <option value="">— Select firm —</option>
            {firms.map(f => <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>)}
          </Select>
        </Field>
        <Field label={mark('Start Date', 'start_date')}>
          <Input type="date" value={form.start_date} onChange={set('start_date')} style={errStyle('start_date')} />
        </Field>
        <Field label="Contracted">
          <Select value={form.contracted} onChange={set('contracted')}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </Select>
        </Field>
        <Field label="Referred By" className="full">
          <Input value={form.refer_by} onChange={set('refer_by')} placeholder="Name" />
        </Field>

        <div className={styles.sectionTitle}>Compensation</div>
        <Field label={mark('Invoice Amt (USD)', 'Invoice_amount')}>
          <FormattedNumberInput value={form.Invoice_amount} onChange={setNum('Invoice_amount')} prefix="US$" placeholder="0" style={errStyle('Invoice_amount')} />
        </Field>
        <Field label={mark('Hours / Week', 'hour')}>
          <Input type="number" value={form.hour} onChange={set('hour')} placeholder="40" style={errStyle('hour')} />
        </Field>
        <Field label={mark('Pay COP', 'pay_cop')}>
          <FormattedNumberInput value={form.pay_cop} onChange={setNum('pay_cop')} prefix="$" placeholder="0" style={errStyle('pay_cop')} />
        </Field>
        <Field label={mark('Pay USD', 'pay_usd')}>
          <FormattedNumberInput value={form.pay_usd} onChange={setNum('pay_usd')} prefix="US$" placeholder="0" style={errStyle('pay_usd')} />
        </Field>

        <div className={styles.sectionTitle}>Notes</div>
        <Field label="Notes" className="full">
          <Input value={form.notes} onChange={set('notes')} placeholder="Additional notes…" />
        </Field>
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} disabled={missing.size > 0} onClick={submit}>
          {initial ? 'Save Changes' : 'Create Assistant'}
        </Button>
      </ModalActions>
    </Modal>
  );
}

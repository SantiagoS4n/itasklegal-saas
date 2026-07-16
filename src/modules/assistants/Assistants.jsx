import { useState, useEffect, useMemo } from 'react';
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
import { dirtyStore } from '@/context/DirtyContext';
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
      (a.city               || '').toLowerCase().includes(q) ||
      (a.role               || '').toLowerCase().includes(q) ||
      (a.Id_document        || '').toLowerCase().includes(q) ||
      (a.law_firm?.firm_name|| '').toLowerCase().includes(q)
    );
  }, [byFirm, search]);

  // 4. Ordenar por columna
  const { sorted, toggle, icon } = useSort(searched, 'full_name', 'asc');

  // 4. Paginación
  const pagination = usePagination(sorted, 25);

  const handleSave = async (btn, row) => {
    const id = row.dataset.id;
    const payload = {};
    row.querySelectorAll('[data-field]').forEach(el => {
      const f   = el.dataset.field;
      const val = el.value !== undefined ? el.value : el.innerText.replace(/,/g, '').trim();
      payload[f] = val === '' ? null : val;
    });
    if (payload.contracted === 'Yes') {
      const REQUIRED = [
        ['Id_document',    'Document ID'],
        ['full_name',      'Full Name'],
        ['email',          'Email'],
        ['phone',          'Phone'],
        ['role',           'Role'],
        ['start_date',     'Start Date'],
        ['Invoice_amount', 'Invoice Amount'],
        ['firm_id',        'Firm'],
        ['hour',           'Hours'],
      ];
      const missing = REQUIRED.filter(([f]) => !payload[f]).map(([, label]) => label);
      if (!payload.pay_cop && !payload.pay_usd) missing.push('Pay COP or Pay USD');
      if (missing.length) {
        toast(`⚠️ Required when contracted is Yes: ${missing.join(', ')}`, 'warning');
        return;
      }
    }
    ['Invoice_amount','pay_cop','pay_usd','hour'].forEach(k => {
      payload[k] = payload[k] ? parseFloat(payload[k]) || null : null;
    });
    payload.firm_id = payload.firm_id || null;
    btn.classList.remove(tableStyles.dirty);
    btn.textContent = '…';
    const { error } = await supabase.from('assistant').update(payload).eq('ID', id);
    if (error) { toast('❌ ' + error.message, 'error'); btn.textContent = 'Save'; return; }
    toast('✓ Assistant saved');
    btn.textContent = '✓'; btn.style.background = 'var(--success)';
    dirtyStore.remove('assistant-' + id);
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);

    // Si contracted pasó de No → Yes, disparar generación de agreement en n8n
    const prevRecord = all.find(a => String(a.ID) === String(id));
    if (payload.contracted === 'Yes' && prevRecord?.contracted !== 'Yes') {
      const agreementUrl = import.meta.env.VITE_N8N_AGREEMENT_WEBHOOK;
      if (agreementUrl) {
        fetch(agreementUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-token': import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',
          },
          body: JSON.stringify({
            assistant_id: id,
            full_name: payload.full_name || prevRecord?.full_name || '',
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

    // Actualiza solo la fila guardada, sin tocar ediciones sin guardar de otras filas
    setAll(prev => prev.map(a => {
      if (String(a.ID) !== String(id)) return a;
      const updated = { ...a, ...payload };
      const firm = firms.find(f => String(f.ID_number) === String(payload.firm_id));
      updated.law_firm = firm ? { firm_name: firm.firm_name } : null;
      return updated;
    }));
  };

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
      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} style={{ minWidth: 2400 }}>
          <thead>
            <tr>
              <SortableTh sortKey="ID"            icon={icon} onToggle={toggle} className={tableStyles.stickyCol}>ID</SortableTh>
              <SortableTh sortKey="Id_document"   icon={icon} onToggle={toggle}>Document</SortableTh>
              <SortableTh sortKey="full_name"     icon={icon} onToggle={toggle}>Name</SortableTh>
              <SortableTh sortKey="phone"         icon={icon} onToggle={toggle}>Phone</SortableTh>
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
            {loading && <TableSkeleton rows={8} cols={21} />}
            {!loading && searched.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={21}>
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
              return (
                <tr key={a.ID} data-id={a.ID}>
                  <td className={tableStyles.stickyCol}
                    onClick={e => e.currentTarget.closest('tr').classList.toggle(tableStyles.selected)}>
                    {a.ID}
                  </td>
                  <EC field="Id_document" value={a.Id_document} />
                  <EC field="full_name"   value={a.full_name}   bold />
                  <EC field="phone"       value={a.phone} />
                  <EC field="email"       value={a.email} />
                  <td>
                    <input className={tableStyles.dateInput} type="date"
                      data-field="date_of_birth" defaultValue={a.date_of_birth || ''}
                      onChange={e => markDirty(e.target)} />
                  </td>
                  <EC field="city" value={a.city} />
                  <td>
                    <select className={`${tableStyles.selInput} ${ROLE_CLASS[a.role] || ''}`}
                      data-field="role" defaultValue={a.role || ''}
                      onChange={e => {
                        const s = e.target;
                        Object.values(ROLE_CLASS).forEach(c => s.classList.remove(c));
                        if (ROLE_CLASS[s.value]) s.classList.add(ROLE_CLASS[s.value]);
                        markDirty(s);
                      }}>
                      <option value="">— Role —</option>
                      <option value="Paralegal">Paralegal</option>
                      <option value="Virtual Assistant">Virtual Assistant</option>
                      <option value="Case Manager">Case Manager</option>
                    </select>
                  </td>
                  <td className={tableStyles.linkCell}>
                    {cvUrl
                      ? <a href={cvUrl} target="_blank" rel="noreferrer">View CV</a>
                      : <span className={tableStyles.noLink}>—</span>}
                  </td>
                  <MoneyEC field="Invoice_amount" value={fmtMoney(a.Invoice_amount)} />
                  <MoneyEC field="pay_cop"        value={fmtMoney(a.pay_cop)} />
                  <MoneyEC field="pay_usd"        value={fmtMoney(a.pay_usd)} />
                  <td>
                    <input className={tableStyles.dateInput} type="date"
                      data-field="start_date" defaultValue={a.start_date || ''}
                      onChange={e => markDirty(e.target)} />
                  </td>
                  <td>
                    <select className={tableStyles.selInput} data-field="firm_id"
                      defaultValue={a.firm_id || ''}
                      onChange={e => markDirty(e.target)}>
                      <option value="">— Firm —</option>
                      {firms.map(f => (
                        <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>
                      ))}
                    </select>
                  </td>
                  <EC field="hour"     value={a.hour ?? ''} />
                  <EC field="notes"    value={a.notes}      wide />
                  <EC field="refer_by" value={a.refer_by} />
                  <td>
                    <select
                      className={`${tableStyles.selInput} ${a.contracted === 'Yes' ? tableStyles.contrYes : tableStyles.contrNo}`}
                      data-field="contracted"
                      defaultValue={a.contracted || 'No'}
                      style={{ minWidth: 75, width: 75, textAlign: 'center' }}
                      onChange={e => {
                        const s = e.target;
                        s.classList.toggle(tableStyles.contrYes, s.value === 'Yes');
                        s.classList.toggle(tableStyles.contrNo,  s.value !== 'Yes');
                        markDirty(s);
                      }}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
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
                    <button className={tableStyles.saveBtn}
                      onClick={e => handleSave(e.currentTarget, e.currentTarget.closest('tr'))}>
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

function EC({ field, value, bold, wide }) {
  const cls = [
    tableStyles.editable,
    bold ? tableStyles.bold : '',
    wide ? tableStyles.wide : '',
  ].filter(Boolean).join(' ');
  return (
    <td>
      <div className={cls} contentEditable suppressContentEditableWarning
        data-field={field} onInput={e => markDirty(e.target)}>
        {value ?? ''}
      </div>
    </td>
  );
}

// Igual que EC, pero reformatea con separadores de miles mientras el usuario escribe.
function MoneyEC({ field, value, bold, wide }) {
  const cls = [
    tableStyles.editable,
    bold ? tableStyles.bold : '',
    wide ? tableStyles.wide : '',
  ].filter(Boolean).join(' ');

  const handleInput = e => {
    const el = e.target;
    let raw = el.innerText.replace(/[^\d.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('').slice(0, 2);
    else if (parts[1]) raw = parts[0] + '.' + parts[1].slice(0, 2);

    const [intPart, decPart] = raw.split('.');
    const intFormatted = intPart ? new Intl.NumberFormat('en-US').format(Number(intPart)) : '';
    const formatted = raw.includes('.') ? `${intFormatted || '0'}.${decPart ?? ''}` : intFormatted;

    if (el.innerText !== formatted) {
      el.innerText = formatted;
      // mover cursor al final
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    markDirty(el);
  };

  return (
    <td>
      <div className={cls} contentEditable suppressContentEditableWarning
        data-field={field} onInput={handleInput}>
        {value ?? ''}
      </div>
    </td>
  );
}

function markDirty(el) {
  const row = el.closest('tr');
  if (!row) return;
  row.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty);
  const id = row.dataset.id;
  if (id) dirtyStore.add('assistant-' + id);
}

function AssistantModal({ open, initial, firms, onClose, onSaved }) {
  const toast = useAppToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

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

    if (form.contracted === 'Yes') {
      const REQUIRED = [
        ['Id_document',    'Document ID'],
        ['email',          'Email'],
        ['phone',          'Phone'],
        ['role',           'Role'],
        ['start_date',     'Start Date'],
        ['Invoice_amount', 'Invoice Amount'],
        ['firm_id',        'Firm'],
        ['hour',           'Hours'],
      ];
      const missing = REQUIRED.filter(([f]) => !form[f]).map(([, label]) => label);
      if (!form.pay_cop && !form.pay_usd) missing.push('Pay COP or Pay USD');
      if (missing.length) {
        toast(`⚠️ Required when contracted is Yes: ${missing.join(', ')}`, 'warning');
        return;
      }
    }

    setSaving(true);
    const payload = {
      ...form,
      full_name:      `${form.name} ${form.lastName}`.trim(),
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
    onSaved();
  };

  return (
    <Modal open={open} title={initial ? 'Edit Assistant' : 'New Assistant'} onClose={onClose} maxWidth={560}>
      <ModalGrid>
        <Field label="First Name *">
          <Input value={form.name} onChange={set('name')} placeholder="María" />
        </Field>
        <Field label="Last Name *">
          <Input value={form.lastName} onChange={set('lastName')} placeholder="García" />
        </Field>
        <Field label="Document ID">
          <Input value={form.Id_document} onChange={set('Id_document')} placeholder="CC 12345678" />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={set('phone')} placeholder="+57 300 000 0000" />
        </Field>
        <Field label="Email" className="full">
          <Input type="email" value={form.email} onChange={set('email')} placeholder="maria@email.com" />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={set('city')} placeholder="Bogotá" />
        </Field>
        <Field label="Birth Date">
          <Input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={set('role')}>
            <option value="">— Select —</option>
            <option value="Paralegal">Paralegal</option>
            <option value="Virtual Assistant">Virtual Assistant</option>
            <option value="Case Manager">Case Manager</option>
          </Select>
        </Field>
        <Field label="Law Firm">
          <Select value={form.firm_id} onChange={set('firm_id')}>
            <option value="">— Select firm —</option>
            {firms.map(f => <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>)}
          </Select>
        </Field>
        <Field label="Start Date">
          <Input type="date" value={form.start_date} onChange={set('start_date')} />
        </Field>
        <Field label="Invoice Amt (USD)">
          <FormattedNumberInput value={form.Invoice_amount} onChange={setNum('Invoice_amount')} prefix="US$" placeholder="0" />
        </Field>
        <Field label="Pay COP">
          <FormattedNumberInput value={form.pay_cop} onChange={setNum('pay_cop')} prefix="$" placeholder="0" />
        </Field>
        <Field label="Pay USD">
          <FormattedNumberInput value={form.pay_usd} onChange={setNum('pay_usd')} prefix="US$" placeholder="0" />
        </Field>
        <Field label="Hours / Week">
          <Input type="number" value={form.hour} onChange={set('hour')} placeholder="40" />
        </Field>
        <Field label="Contracted">
          <Select value={form.contracted} onChange={set('contracted')}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </Select>
        </Field>
        <Field label="Referred By">
          <Input value={form.refer_by} onChange={set('refer_by')} placeholder="Name" />
        </Field>
        <Field label="Notes" className="full">
          <Input value={form.notes} onChange={set('notes')} placeholder="Additional notes…" />
        </Field>
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>
          {initial ? 'Save Changes' : 'Create Assistant'}
        </Button>
      </ModalActions>
    </Modal>
  );
}
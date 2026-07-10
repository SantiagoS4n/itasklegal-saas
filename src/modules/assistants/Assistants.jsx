import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, ModalGrid, ModalActions } from '@/components/ui/index';
import { fmtMoney, safeUrl } from '@/utils/format';
import tableStyles from '@/styles/table.module.css';
import styles from './Assistants.module.css';

const EMPTY = {
  name: '', lastName: '', Id_document: '', phone: '', email: '',
  city: '', date_of_birth: '', role: '', firm_id: '',
  start_date: '', Invoice_amount: '', pay_cop: '', pay_usd: '',
  hour: '', contracted: 'No', refer_by: '', notes: '',
};

const ROLE_CLASS = {
  'Paralegal':        tableStyles.roleParalegal,
  'Virtual Assistant': tableStyles.roleVA,
  'Case Manager':     tableStyles.roleCM,
};

export function Assistants() {
  const toast = useAppToast();
  const [assistants, setAssistants] = useState([]);
  const [firms,      setFirms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState({ open: false, data: null });

  const load = async () => {
    setLoading(true);
    const [asRes, fmRes] = await Promise.all([
      supabase.from('assistant').select('*, law_firm(firm_name)').order('ID'),
      supabase.from('law_firm').select('ID_number, firm_name').order('firm_name'),
    ]);
    if (asRes.error) toast('❌ ' + asRes.error.message, 'error');
    else setAssistants(asRes.data);
    if (!fmRes.error) setFirms(fmRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (btn, row) => {
    const id = row.dataset.id;
    const payload = {};
    row.querySelectorAll('[data-field]').forEach(el => {
      const f   = el.dataset.field;
      const val = el.value !== undefined ? el.value : el.innerText.replace(/,/g, '').trim();
      payload[f] = val === '' ? null : val;
    });
    // Validaciones
    if (payload.contracted === 'Yes' && !payload.Id_document) {
      toast('⚠️ Document ID required when contracted is Yes', 'warning'); return;
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
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assistants</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${assistants.length} assistants`}</p>
        </div>
        <Button variant="dark" onClick={() => setModal({ open: true, data: null })}>
          + New Assistant
        </Button>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} style={{ minWidth: 2400 }}>
          <thead>
            <tr>
              <th className={tableStyles.stickyCol}>ID</th>
              <th>Document</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Birth Date</th>
              <th>City</th>
              <th>Role</th>
              <th style={{ textAlign: 'center' }}>CV</th>
              <th>Inv. Amt</th>
              <th>COP</th>
              <th>USD</th>
              <th>Start Date</th>
              <th>Firm</th>
              <th>Hours</th>
              <th>Notes</th>
              <th>Referred By</th>
              <th>Contracted</th>
              <th style={{ textAlign: 'center' }}>Firm Agr.</th>
              <th style={{ textAlign: 'center' }}>VA Agr.</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr className={tableStyles.stateRow}><td colSpan={21}>Loading assistants…</td></tr>}
            {!loading && assistants.length === 0 && (
              <tr className={tableStyles.stateRow}><td colSpan={21}>No assistants yet.</td></tr>
            )}
            {!loading && assistants.map(a => {
              const cvUrl   = safeUrl(a.link_CV);
              const firmUrl = safeUrl(a.Firm_agreement);
              const vaUrl   = safeUrl(a.VA_agreement);
              return (
                <tr key={a.ID} data-id={a.ID}>
                  <td className={tableStyles.stickyCol}
                    onClick={e => e.currentTarget.closest('tr').classList.toggle(tableStyles.selected)}>
                    {a.ID}
                  </td>
                  <EditableCell field="Id_document" value={a.Id_document} />
                  <EditableCell field="full_name" value={a.full_name} bold />
                  <EditableCell field="phone" value={a.phone} />
                  <EditableCell field="email" value={a.email} />
                  <td><input className={tableStyles.dateInput} type="date" data-field="date_of_birth" defaultValue={a.date_of_birth || ''} onChange={e => markDirty(e.target)} /></td>
                  <EditableCell field="city" value={a.city} />
                  <td>
                    <select className={`${tableStyles.selInput} ${ROLE_CLASS[a.role] || ''}`}
                      data-field="role"
                      defaultValue={a.role || ''}
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
                    {cvUrl ? <a href={cvUrl} target="_blank" rel="noreferrer">View CV</a> : <span className={tableStyles.noLink}>—</span>}
                  </td>
                  <EditableCell field="Invoice_amount" value={fmtMoney(a.Invoice_amount)} />
                  <EditableCell field="pay_cop" value={fmtMoney(a.pay_cop)} />
                  <EditableCell field="pay_usd" value={fmtMoney(a.pay_usd)} />
                  <td><input className={tableStyles.dateInput} type="date" data-field="start_date" defaultValue={a.start_date || ''} onChange={e => markDirty(e.target)} /></td>
                  <td>
                    <select className={tableStyles.selInput} data-field="firm_id"
                      defaultValue={a.firm_id || ''}
                      onChange={e => markDirty(e.target)}>
                      <option value="">— Firm —</option>
                      {firms.map(f => <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>)}
                    </select>
                  </td>
                  <EditableCell field="hour" value={a.hour ?? ''} />
                  <EditableCell field="notes" value={a.notes} wide />
                  <EditableCell field="refer_by" value={a.refer_by} />
                  <td>
                    <select className={`${tableStyles.selInput} ${a.contracted === 'Yes' ? tableStyles.contrYes : tableStyles.contrNo}`}
                      data-field="contracted"
                      defaultValue={a.contracted || 'No'}
                      onChange={e => {
                        const s = e.target;
                        s.classList.toggle(tableStyles.contrYes, s.value === 'Yes');
                        s.classList.toggle(tableStyles.contrNo,  s.value !== 'Yes');
                        markDirty(s);
                      }}
                      style={{ minWidth: 75, width: 75, textAlign: 'center' }}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className={tableStyles.linkCell}>
                    {firmUrl ? <a href={firmUrl} target="_blank" rel="noreferrer">Firm Agr.</a> : <span className={tableStyles.noLink}>—</span>}
                  </td>
                  <td className={tableStyles.linkCell}>
                    {vaUrl ? <a href={vaUrl} target="_blank" rel="noreferrer">VA Agr.</a> : <span className={tableStyles.noLink}>—</span>}
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

/* ── Helper: celda editable ── */
function EditableCell({ field, value, bold, wide }) {
  const cls = [
    tableStyles.editable,
    bold ? tableStyles.bold : '',
    wide ? tableStyles.wide : '',
  ].filter(Boolean).join(' ');
  return (
    <td>
      <div className={cls}
        contentEditable suppressContentEditableWarning
        data-field={field}
        onInput={e => markDirty(e.target)}>
        {value ?? ''}
      </div>
    </td>
  );
}

function markDirty(el) {
  el.closest('tr')?.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty);
}

/* ── Modal create/edit ── */
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

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }));

  const submit = async () => {
    if (!form.name && !form.lastName) { toast('⚠️ Name is required', 'warning'); return; }
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
          <Input type="number" value={form.Invoice_amount} onChange={set('Invoice_amount')} placeholder="0" />
        </Field>
        <Field label="Pay COP">
          <Input type="number" value={form.pay_cop} onChange={set('pay_cop')} placeholder="0" />
        </Field>
        <Field label="Pay USD">
          <Input type="number" value={form.pay_usd} onChange={set('pay_usd')} placeholder="0" />
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

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, ModalGrid, ModalActions } from '@/components/ui/index';
import { fmtMoney } from '@/utils/format';
import tableStyles from '@/styles/table.module.css';
import styles from './Invoices.module.css';

const EMPTY = {
  invoice_number: '', firm_id: '', start_date: '', end_date: '',
  invoice_date: '', amount: '', estado: 'pendiente',
};

const ESTADO_CLASS = {
  pendiente: styles.estadoPendiente,
  pagada:    styles.estadoPagada,
  vencida:   styles.estadoVencida,
};

const ESTADO_LABEL = {
  pendiente: 'Pending',
  pagada:    'Paid',
  vencida:   'Overdue',
};

export function Invoices() {
  const toast = useAppToast();
  const [invoices, setInvoices] = useState([]);
  const [firms,    setFirms]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState({ open: false, data: null });
  const [filter,   setFilter]   = useState('all'); // all | pendiente | pagada | vencida

  const load = async () => {
    setLoading(true);
    const [invRes, fmRes] = await Promise.all([
      supabase.from('invoice')
        .select('*, law_firm(firm_name)')
        .order('invoice_date', { ascending: false }),
      supabase.from('law_firm').select('ID_number, firm_name').order('firm_name'),
    ]);
    if (invRes.error) toast('❌ ' + invRes.error.message, 'error');
    else setInvoices(invRes.data);
    if (!fmRes.error) setFirms(fmRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (btn, row) => {
    const id = row.dataset.id;
    const payload = {};
    row.querySelectorAll('[data-field]').forEach(el => {
      const val = el.value !== undefined ? el.value : el.innerText.trim();
      payload[el.dataset.field] = val || null;
    });
    payload.amount = payload.amount ? parseFloat(payload.amount) : null;
    btn.classList.remove(tableStyles.dirty);
    btn.textContent = '…';
    const { error } = await supabase.from('invoice').update(payload).eq('invoice_number', id);
    if (error) { toast('❌ ' + error.message, 'error'); btn.textContent = 'Save'; return; }
    toast('✓ Invoice saved');
    btn.textContent = '✓'; btn.style.background = 'var(--success)';
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete invoice #${id}?`)) return;
    const { error } = await supabase.from('invoice').delete().eq('invoice_number', id);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ Invoice deleted');
    load();
  };

  // KPIs
  const total     = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const pendiente = invoices.filter(i => i.estado === 'pendiente').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const vencida   = invoices.filter(i => i.estado === 'vencida').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const pagada    = invoices.filter(i => i.estado === 'pagada').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.estado === filter);

  const markDirty = el =>
    el.closest('tr')?.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty);

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Invoices</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${filtered.length} invoices`}</p>
        </div>
        <Button variant="dark" onClick={() => setModal({ open: true, data: null })}>
          + New Invoice
        </Button>
      </div>

      {/* KPI Cards */}
      {!loading && (
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Total Billed</div>
            <div className={styles.kpiValue}>${fmtMoney(total)}</div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
            <div className={styles.kpiLabel}>Paid</div>
            <div className={styles.kpiValue}>${fmtMoney(pagada)}</div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiYellow}`}>
            <div className={styles.kpiLabel}>Pending</div>
            <div className={styles.kpiValue}>${fmtMoney(pendiente)}</div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiRed}`}>
            <div className={styles.kpiLabel}>Overdue</div>
            <div className={styles.kpiValue}>${fmtMoney(vencida)}</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className={styles.filterRow}>
        {['all','pendiente','pagada','vencida'].map(f => (
          <button key={f}
            className={`${styles.filterTab} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : ESTADO_LABEL[f]}
            <span className={styles.filterCount}>
              {f === 'all' ? invoices.length : invoices.filter(i => i.estado === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} style={{ minWidth: 1000 }}>
          <thead>
            <tr>
              <th className={tableStyles.stickyCol}>#</th>
              <th>Law Firm</th>
              <th>Amount (USD)</th>
              <th>Status</th>
              <th>Invoice Date</th>
              <th>Period Start</th>
              <th>Period End</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={8}>Loading invoices…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={8}>No invoices found.</td>
              </tr>
            )}
            {!loading && filtered.map(inv => (
              <tr key={inv.invoice_number} data-id={inv.invoice_number}>
                <td className={tableStyles.stickyCol}
                  onClick={e => e.currentTarget.closest('tr').classList.toggle(tableStyles.selected)}>
                  {inv.invoice_number}
                </td>
                <td>
                  <select className={tableStyles.selInput} data-field="firm_id"
                    defaultValue={inv.firm_id || ''}
                    onChange={e => markDirty(e.target)}>
                    <option value="">— Firm —</option>
                    {firms.map(f => (
                      <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className={tableStyles.editable} contentEditable suppressContentEditableWarning
                    data-field="amount"
                    onInput={e => markDirty(e.target)}>
                    {inv.amount ?? ''}
                  </div>
                </td>
                <td>
                  <select
                    className={`${tableStyles.selInput} ${ESTADO_CLASS[inv.estado] || ''}`}
                    data-field="estado"
                    defaultValue={inv.estado || 'pendiente'}
                    onChange={e => {
                      const s = e.target;
                      Object.values(ESTADO_CLASS).forEach(c => s.classList.remove(c));
                      s.classList.add(ESTADO_CLASS[s.value] || '');
                      markDirty(s);
                    }}>
                    <option value="pendiente">Pending</option>
                    <option value="pagada">Paid</option>
                    <option value="vencida">Overdue</option>
                  </select>
                </td>
                <td>
                  <input className={tableStyles.dateInput} type="date" data-field="invoice_date"
                    defaultValue={inv.invoice_date || ''}
                    onChange={e => markDirty(e.target)} />
                </td>
                <td>
                  <input className={tableStyles.dateInput} type="date" data-field="start_date"
                    defaultValue={inv.start_date || ''}
                    onChange={e => markDirty(e.target)} />
                </td>
                <td>
                  <input className={tableStyles.dateInput} type="date" data-field="end_date"
                    defaultValue={inv.end_date || ''}
                    onChange={e => markDirty(e.target)} />
                </td>
                <td className={tableStyles.actCol}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button className={tableStyles.saveBtn}
                      onClick={e => handleSave(e.currentTarget, e.currentTarget.closest('tr'))}>
                      Save
                    </button>
                    <button className={tableStyles.deleteBtn}
                      onClick={() => handleDelete(inv.invoice_number)}>
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InvoiceModal
        open={modal.open}
        initial={modal.data}
        firms={firms}
        onClose={() => setModal({ open: false, data: null })}
        onSaved={() => { setModal({ open: false, data: null }); load(); }}
      />
    </div>
  );
}

/* ── Modal ── */
function InvoiceModal({ open, initial, firms, onClose, onSaved }) {
  const toast = useAppToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? {
      invoice_number: initial.invoice_number || '',
      firm_id:        initial.firm_id        || '',
      start_date:     initial.start_date     || '',
      end_date:       initial.end_date       || '',
      invoice_date:   initial.invoice_date   || '',
      amount:         initial.amount         ?? '',
      estado:         initial.estado         || 'pendiente',
    } : EMPTY);
  }, [initial, open]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async () => {
    if (!form.invoice_number.trim()) { toast('⚠️ Invoice number is required', 'warning'); return; }
    if (!form.firm_id)               { toast('⚠️ Law firm is required', 'warning'); return; }
    setSaving(true);
    const payload = {
      invoice_number: form.invoice_number.trim(),
      firm_id:        form.firm_id        || null,
      start_date:     form.start_date     || null,
      end_date:       form.end_date       || null,
      invoice_date:   form.invoice_date   || null,
      amount:         parseFloat(form.amount) || null,
      estado:         form.estado,
    };
    const { error } = initial
      ? await supabase.from('invoice').update(payload).eq('invoice_number', initial.invoice_number)
      : await supabase.from('invoice').insert(payload);
    setSaving(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast(initial ? '✓ Invoice updated' : '✓ Invoice created');
    onSaved();
  };

  return (
    <Modal open={open} title={initial ? 'Edit Invoice' : 'New Invoice'} onClose={onClose} maxWidth={500}>
      <ModalGrid>
        <Field label="Invoice Number *" className="full">
          <Input
            value={form.invoice_number}
            onChange={set('invoice_number')}
            placeholder="INV-2024-001"
            disabled={!!initial}
          />
        </Field>
        <Field label="Law Firm *" className="full">
          <Select value={form.firm_id} onChange={set('firm_id')}>
            <option value="">— Select firm —</option>
            {firms.map(f => (
              <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (USD)">
          <Input type="number" value={form.amount} onChange={set('amount')} placeholder="0.00" />
        </Field>
        <Field label="Status">
          <Select value={form.estado} onChange={set('estado')}>
            <option value="pendiente">Pending</option>
            <option value="pagada">Paid</option>
            <option value="vencida">Overdue</option>
          </Select>
        </Field>
        <Field label="Invoice Date" className="full">
          <Input type="date" value={form.invoice_date} onChange={set('invoice_date')} />
        </Field>
        <Field label="Period Start">
          <Input type="date" value={form.start_date} onChange={set('start_date')} />
        </Field>
        <Field label="Period End">
          <Input type="date" value={form.end_date} onChange={set('end_date')} />
        </Field>
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>
          {initial ? 'Save Changes' : 'Create Invoice'}
        </Button>
      </ModalActions>
    </Modal>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, ModalGrid, ModalActions } from '@/components/ui/index';
import { fmtMoney } from '@/utils/format';
import { exportToCSV } from '@/utils/exportCSV';
import { MonthFilter, filterByMonth } from '@/components/ui/MonthFilter';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import tableStyles from '@/styles/table.module.css';
import { dirtyStore } from '@/context/DirtyContext';
import styles from './Invoices.module.css';

const EMPTY = {
  invoice_number: '', firm_id: '', start_date: '', end_date: '',
  invoice_date: '', amount: '', status: 'pending',
};

const ESTADO_CLASS = {
  pending: styles.estadoPendiente,
  paid:    styles.estadoPagada,
  overdue: styles.estadoVencida,
};

const ESTADO_LABEL = {
  pending: 'Pending',
  paid:    'Paid',
  overdue: 'Overdue',
};

export function Invoices() {
  const toast = useAppToast();
  const [invoices, setInvoices] = useState([]);
  const [firms,    setFirms]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState({ open: false, data: null });
  const [autoModal,   setAutoModal]   = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [filter,   setFilter]   = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [sort,     setSort]     = useState({ key: 'invoice_date', dir: 'desc' });

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
    toast('✓ Invoice saved'); dirtyStore.remove('invoice-' + id);
    btn.textContent = '✓'; btn.style.background = 'var(--success)';
    setInvoices(prev => prev.map(inv => {
      if (String(inv.invoice_number) !== String(id)) return inv;
      const updated = { ...inv, ...payload };
      const firm = firms.find(f => String(f.ID_number) === String(payload.firm_id));
      updated.law_firm = firm ? { firm_name: firm.firm_name } : null;
      return updated;
    }));
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete invoice #${id}?`)) return;
    const { error } = await supabase.from('invoice').delete().eq('invoice_number', id);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ Invoice deleted');
    load();
  };

  // Sorting handler
  const toggleSort = (key) => {
    setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const sortIcon = (key) => {
    if (sort.key !== key) return ' ↕';
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  };

  // KPIs
  const total     = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const pending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const overdue  = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const paid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  // Filter + Sort
  const displayed = useMemo(() => {
    let rows = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
    rows = filterByMonth(rows, 'invoice_date', monthFilter);
    rows = [...rows].sort((a, b) => {
      let valA = '', valB = '';
      if (sort.key === 'invoice_number') {
        valA = a.invoice_number || '';
        valB = b.invoice_number || '';
      } else if (sort.key === 'firm_name') {
        valA = a.law_firm?.firm_name || '';
        valB = b.law_firm?.firm_name || '';
      } else if (sort.key === 'amount') {
        return sort.dir === 'asc'
          ? (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0)
          : (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
      } else if (sort.key === 'invoice_date') {
        valA = a.invoice_date || '';
        valB = b.invoice_date || '';
      } else if (sort.key === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      }
      return sort.dir === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
    return rows;
  }, [invoices, filter, monthFilter, sort]);

  const pagination = usePagination(displayed, 25);

  const markDirty = el => {
    const r = el.closest('tr');
    if (!r) return;
    r.querySelector('.' + tableStyles.saveBtn)?.classList.add(tableStyles.dirty);
    dirtyStore.add('invoice-' + r.dataset.id);
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Invoices</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${displayed.length} invoices`}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => exportToCSV(
            displayed,
            [
              { key: 'invoice_number', label: 'Invoice #' },
              { key: 'law_firm.firm_name', label: 'Law Firm' },
              { key: 'amount', label: 'Amount USD' },
              { key: 'status', label: 'Status' },
              { key: 'invoice_date', label: 'Invoice Date' },
              { key: 'start_date', label: 'Period Start' },
              { key: 'end_date', label: 'Period End' },
            ],
            `invoices_${filter}`
          )}>
            ⬇ Export
          </Button>
          <Button variant="ghost" onClick={() => setManualModal(true)}>
            Manual
          </Button>
          <Button variant="dark" onClick={() => setAutoModal(true)}>
            + New Invoice
          </Button>
        </div>
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
            <div className={styles.kpiValue}>${fmtMoney(paid)}</div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiYellow}`}>
            <div className={styles.kpiLabel}>Pending</div>
            <div className={styles.kpiValue}>${fmtMoney(pending)}</div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiRed}`}>
            <div className={styles.kpiLabel}>Overdue</div>
            <div className={styles.kpiValue}>${fmtMoney(overdue)}</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className={styles.filterRow}>
        {['all','pending','paid','overdue'].map(f => (
          <button key={f}
            className={`${styles.filterTab} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : ESTADO_LABEL[f]}
            <span className={styles.filterCount}>
              {f === 'all' ? invoices.length : invoices.filter(i => i.status === f).length}
            </span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <MonthFilter value={monthFilter} onChange={setMonthFilter} />
        </div>
      </div>

      {/* Table */}
      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} style={{ minWidth: 1000 }}>
          <thead>
            <tr>
              <th className={`${tableStyles.stickyCol} ${styles.sortable}`}
                onClick={() => toggleSort('invoice_number')}>
                #{sortIcon('invoice_number')}
              </th>
              <th className={styles.sortable} onClick={() => toggleSort('firm_name')}>
                Law Firm{sortIcon('firm_name')}
              </th>
              <th className={styles.sortable} onClick={() => toggleSort('amount')}>
                Amount (USD){sortIcon('amount')}
              </th>
              <th className={styles.sortable} onClick={() => toggleSort('status')}>
                Status{sortIcon('status')}
              </th>
              <th className={styles.sortable} onClick={() => toggleSort('invoice_date')}>
                Invoice Date{sortIcon('invoice_date')}
              </th>
              <th>Period Start</th>
              <th>Period End</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={8} cols={8} />}
            {!loading && displayed.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={8}>No invoices found.</td>
              </tr>
            )}
            {!loading && pagination.paginated.map(inv => (
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
                    data-field="amount" onInput={e => markDirty(e.target)}>
                    {inv.amount ?? ''}
                  </div>
                </td>
                <td>
                  <select
                    className={`${tableStyles.selInput} ${ESTADO_CLASS[inv.status] || ''}`}
                    data-field="status"
                    defaultValue={inv.status || 'pending'}
                    onChange={e => {
                      const s = e.target;
                      Object.values(ESTADO_CLASS).forEach(c => s.classList.remove(c));
                      s.classList.add(ESTADO_CLASS[s.value] || '');
                      markDirty(s);
                    }}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
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

      <Pagination {...pagination} />

      {/* Modal de edición (clic en fila existente) */}
      <InvoiceModal
        open={modal.open}
        initial={modal.data}
        firms={firms}
        onClose={() => setModal({ open: false, data: null })}
        onSaved={() => { setModal({ open: false, data: null }); load(); }}
      />

      {/* Modal Auto — dispara n8n */}
      <AutoInvoiceModal
        open={autoModal}
        firms={firms}
        onClose={() => setAutoModal(false)}
        onDone={() => { setAutoModal(false); load(); }}
      />

      {/* Modal Manual — crea factura a mano (respaldo) */}
      <InvoiceModal
        open={manualModal}
        initial={null}
        firms={firms}
        onClose={() => setManualModal(false)}
        onSaved={() => { setManualModal(false); load(); }}
      />
    </div>
  );
}

/* ── Modal Auto: dispara el webhook de n8n ── */
function AutoInvoiceModal({ open, firms, onClose, onDone }) {
  const toast = useAppToast();
  const [firmId, setFirmId] = useState('');
  const [month,  setMonth]  = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) { setFirmId(''); setMonth(''); }
  }, [open]);

  const trigger = async () => {
    if (!firmId) { toast('⚠️ Select a firm', 'warning'); return; }

    const webhookUrl = import.meta.env.VITE_N8N_INVOICE_WEBHOOK;
    if (!webhookUrl) {
      toast('❌ Webhook URL not configured (VITE_N8N_INVOICE_WEBHOOK)', 'error');
      return;
    }

    // DEBUG TEMPORAL — quitar después de confirmar
    const debugToken = import.meta.env.VITE_N8N_WEBHOOK_TOKEN;
    console.log('DEBUG token length:', debugToken ? debugToken.length : 'EMPTY/UNDEFINED');
    toast(`Debug: token ${debugToken ? 'len ' + debugToken.length : 'VACÍO'}`, 'warning');

    setSending(true);
    const firm = firms.find(f => String(f.ID_number) === String(firmId));
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-token': import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',
        },
        body: JSON.stringify({
          firm_id:   firmId,
          firm_name: firm?.firm_name || '',
          month:     month || null,   // opcional
          triggered_at: new Date().toISOString(),
        }),
      });
      setSending(false);
      if (!res.ok) {
        toast(`❌ Webhook responded ${res.status}`, 'error');
        return;
      }
      toast('✓ Invoice generation triggered — n8n is processing');
      onDone();
    } catch (err) {
      setSending(false);
      toast('❌ Could not reach n8n: ' + err.message, 'error');
    }
  };

  return (
    <Modal open={open} title="Generate Invoice (Automatic)" onClose={onClose} maxWidth={460}>
      <div className={styles.autoInfo}>
        This triggers the n8n workflow that generates the invoice automatically
        using today's date. Select the firm (and optionally a specific month).
      </div>
      <ModalGrid>
        <Field label="Law Firm *" className="full">
          <Select value={firmId} onChange={e => setFirmId(e.target.value)}>
            <option value="">— Select firm —</option>
            {firms.map(f => (
              <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Month (optional)" className="full">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </Field>
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={sending} onClick={trigger}>
          Generate Invoice
        </Button>
      </ModalActions>
    </Modal>
  );
}

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
      status:         initial.status         || 'pending',
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
      status:         form.status,
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
          <Input value={form.invoice_number} onChange={set('invoice_number')}
            placeholder="INV-2024-001" disabled={!!initial} />
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
          <Select value={form.status} onChange={set('status')}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
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
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Select, ModalActions, SortableTh } from '@/components/ui/index';
import { useSort } from '@/hooks/useSort';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { fmtMoney } from '@/utils/format';
import { exportToCSV } from '@/utils/exportCSV';
import tableStyles from '@/styles/table.module.css';
import styles from './Payments.module.css';

export function Payments() {
  const toast = useAppToast();
  const [payments,   setPayments]   = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('all');
  const [aliasModal, setAliasModal] = useState(null);

  const load = async () => {
    setLoading(true);
    const [payRes, asRes] = await Promise.all([
      supabase.from('remitly').select('*, assistant:assistant_id(full_name)').order('Date', { ascending: false }),
      supabase.from('assistant').select('ID, full_name').order('full_name'),
    ]);
    if (payRes.error) toast('❌ ' + payRes.error.message, 'error');
    else setPayments(payRes.data);
    if (!asRes.error) setAssistants(asRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pending = payments.filter(p => !p.assistant_id);
  const base    = tab === 'unmatched' ? pending : payments;

  const { sorted, toggle, icon } = useSort(base, 'Date', 'desc');
  const pagination = usePagination(sorted, 25);

  const resolveAlias = async (recipient_raw, assistant_id) => {
    if (!assistant_id) { toast('⚠️ Select an assistant', 'warning'); return; }
    const { error } = await supabase.from('recipient_alias').upsert({ recipient_raw, assistant_id }, { onConflict: 'recipient_raw' });
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast('✓ Alias saved — payments resolved automatically');
    setAliasModal(null);
    load();
  };

  const totalUSD  = payments.reduce((s, p) => s + (parseFloat(p['Total USD'])       || 0), 0);
  const totalRcpt = payments.reduce((s, p) => s + (parseFloat(p['Total Recipient']) || 0), 0);
  const totalFee  = payments.reduce((s, p) => s + (parseFloat(p['Fee'])             || 0), 0);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Payments</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${sorted.length} transfers`}</p>
        </div>
        <Button variant="ghost" onClick={() => exportToCSV(
          sorted,
          [
            { key: 'ID', label: 'ID' },
            { key: 'Date', label: 'Date' },
            { key: 'Recipient', label: 'Recipient' },
            { key: 'assistant.full_name', label: 'Assistant' },
            { key: 'Reference No', label: 'Reference No' },
            { key: 'Total USD', label: 'Total USD' },
            { key: 'Fee', label: 'Fee' },
            { key: 'Total Amount', label: 'Total Amount' },
            { key: 'Currency', label: 'Currency' },
            { key: 'Total Recipient', label: 'Total Recipient' },
            { key: 'Exchange Rate', label: 'Exchange Rate' },
          ],
          `payments_${tab}`
        )}>
          ⬇ Export
        </Button>
      </div>

      {!loading && (
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Total Sent (USD)</div>
            <div className={styles.kpiValue}>${fmtMoney(totalUSD)}</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Total Received</div>
            <div className={styles.kpiValue}>{fmtMoney(totalRcpt)}</div>
            <div className={styles.kpiSub}>local currency</div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiYellow}`}>
            <div className={styles.kpiLabel}>Total Fees</div>
            <div className={styles.kpiValue}>${fmtMoney(totalFee)}</div>
          </div>
          <div className={`${styles.kpiCard} ${pending.length > 0 ? styles.kpiRed : styles.kpiGreen}`}>
            <div className={styles.kpiLabel}>Unmatched</div>
            <div className={styles.kpiValue}>{pending.length}</div>
            <div className={styles.kpiSub}>{pending.length > 0 ? 'need assignment' : 'all matched ✓'}</div>
          </div>
        </div>
      )}

      <div className={styles.filterRow}>
        <button className={`${styles.filterTab} ${tab === 'all' ? styles.filterActive : ''}`} onClick={() => setTab('all')}>
          All Payments <span className={styles.filterCount}>{payments.length}</span>
        </button>
        <button className={`${styles.filterTab} ${tab === 'unmatched' ? styles.filterActive : ''}`} onClick={() => setTab('unmatched')}>
          ⚠️ Unmatched <span className={styles.filterCount}>{pending.length}</span>
        </button>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <SortableTh sortKey="ID"               icon={icon} onToggle={toggle} className={tableStyles.stickyCol}>ID</SortableTh>
              <SortableTh sortKey="Date"             icon={icon} onToggle={toggle}>Date</SortableTh>
              <SortableTh sortKey="Recipient"        icon={icon} onToggle={toggle}>Recipient (raw)</SortableTh>
              <SortableTh sortKey="assistant.full_name" icon={icon} onToggle={toggle}>Assistant</SortableTh>
              <th>Reference No</th>
              <SortableTh sortKey="Total USD"        icon={icon} onToggle={toggle}>Total USD</SortableTh>
              <SortableTh sortKey="Fee"              icon={icon} onToggle={toggle}>Fee</SortableTh>
              <SortableTh sortKey="Total Amount"     icon={icon} onToggle={toggle}>Total Amount</SortableTh>
              <th>Currency</th>
              <SortableTh sortKey="Total Recipient"  icon={icon} onToggle={toggle}>Total Recipient</SortableTh>
              <th>Exchange Rate</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={8} cols={12} />}
            {!loading && sorted.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={12}>{tab === 'unmatched' ? '✓ All payments are matched.' : 'No payments found.'}</td>
              </tr>
            )}
            {!loading && pagination.paginated.map(p => (
              <tr key={p.ID} data-id={p.ID} className={!p.assistant_id ? styles.unmatchedRow : ''}>
                <td className={tableStyles.stickyCol} onClick={e => e.currentTarget.closest('tr').classList.toggle(tableStyles.selected)}>{p.ID}</td>
                <td style={{ whiteSpace:'nowrap' }}>{p.Date || '—'}</td>
                <td><span className={styles.recipientRaw}>{p.Recipient || '—'}</span></td>
                <td>
                  {p.assistant?.full_name
                    ? <span className={styles.matchedBadge}>{p.assistant.full_name}</span>
                    : <span className={styles.unmatchedBadge}>Unmatched</span>}
                </td>
                <td style={{ whiteSpace:'nowrap', color:'var(--text-2)', fontSize:12 }}>{p['Reference No'] || '—'}</td>
                <td><strong>${fmtMoney(p['Total USD'])}</strong></td>
                <td style={{ color:'var(--danger)' }}>${fmtMoney(p['Fee'])}</td>
                <td>${fmtMoney(p['Total Amount'])}</td>
                <td>{p['Currency'] || '—'}</td>
                <td><strong>{fmtMoney(p['Total Recipient'])}</strong></td>
                <td style={{ color:'var(--text-2)', fontSize:12 }}>{p['Exchange Rate'] || '—'}</td>
                <td className={tableStyles.actCol}>
                  {!p.assistant_id && (
                    <button className={styles.assignBtn} onClick={() => setAliasModal({ recipient_raw: p.Recipient })}>Assign</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} />

      <AliasModal open={!!aliasModal} recipientRaw={aliasModal?.recipient_raw} assistants={assistants} onClose={() => setAliasModal(null)} onSave={resolveAlias} />
    </div>
  );
}

function AliasModal({ open, recipientRaw, assistants, onClose, onSave }) {
  const [assistantId, setAssistantId] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setAssistantId(''); }, [open]);
  const submit = async () => { setSaving(true); await onSave(recipientRaw, assistantId); setSaving(false); };
  return (
    <Modal open={open} title="Assign Payment" onClose={onClose} maxWidth={420}>
      <div className={styles.aliasInfo}>
        <div className={styles.aliasLabel}>Recipient in Remitly</div>
        <div className={styles.aliasValue}>"{recipientRaw}"</div>
        <div className={styles.aliasNote}>This will create a permanent alias. All future payments with this exact recipient name will resolve automatically.</div>
      </div>
      <Field label="Assign to Assistant">
        <Select value={assistantId} onChange={e => setAssistantId(e.target.value)}>
          <option value="">— Select assistant —</option>
          {assistants.map(a => <option key={a.ID} value={a.ID}>{a.full_name}</option>)}
        </Select>
      </Field>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>Save Alias</Button>
      </ModalActions>
    </Modal>
  );
}

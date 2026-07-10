import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Select, ModalActions } from '@/components/ui/index';
import { fmtMoney } from '@/utils/format';
import tableStyles from '@/styles/table.module.css';
import styles from './Payments.module.css';

export function Payments() {
  const toast = useAppToast();
  const [payments,    setPayments]    = useState([]);
  const [pending,     setPending]     = useState([]); // Remitly sin assistant_id
  const [assistants,  setAssistants]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('all'); // all | unmatched
  const [aliasModal,  setAliasModal]  = useState(null); // { recipient_raw }

  const load = async () => {
    setLoading(true);
    const [payRes, asRes] = await Promise.all([
      supabase.from('remitly')
        .select('*, assistant:assistant_id(full_name)')
        .order('Date', { ascending: false }),
      supabase.from('assistant')
        .select('ID, full_name')
        .order('full_name'),
    ]);
    if (payRes.error) { toast('❌ ' + payRes.error.message, 'error'); }
    else {
      setPayments(payRes.data);
      setPending(payRes.data.filter(p => !p.assistant_id));
    }
    if (!asRes.error) setAssistants(asRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Guardar alias y resolver pagos pendientes
  const resolveAlias = async (recipient_raw, assistant_id) => {
    if (!assistant_id) { toast('⚠️ Select an assistant', 'warning'); return; }

    // Insertar alias — el trigger de Postgres resuelve los pagos viejos automáticamente
    const { error: aliasErr } = await supabase
      .from('recipient_alias')
      .upsert({ recipient_raw, assistant_id }, { onConflict: 'recipient_raw' });

    if (aliasErr) { toast('❌ ' + aliasErr.message, 'error'); return; }

    toast('✓ Alias saved — payments resolved automatically');
    setAliasModal(null);
    load();
  };

  // KPIs
  const totalUSD  = payments.reduce((s, p) => s + (parseFloat(p['Total USD'])  || 0), 0);
  const totalRcpt = payments.reduce((s, p) => s + (parseFloat(p['Total Recipient']) || 0), 0);
  const totalFee  = payments.reduce((s, p) => s + (parseFloat(p['Fee'])         || 0), 0);

  const displayed = tab === 'unmatched' ? pending : payments;

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Payments</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${displayed.length} transfers`}</p>
        </div>
      </div>

      {/* KPIs */}
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

      {/* Tabs */}
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterTab} ${tab === 'all' ? styles.filterActive : ''}`}
          onClick={() => setTab('all')}>
          All Payments
          <span className={styles.filterCount}>{payments.length}</span>
        </button>
        <button
          className={`${styles.filterTab} ${tab === 'unmatched' ? styles.filterActive : ''}`}
          onClick={() => setTab('unmatched')}>
          ⚠️ Unmatched
          <span className={styles.filterCount}>{pending.length}</span>
        </button>
      </div>

      {/* Table */}
      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th className={tableStyles.stickyCol}>ID</th>
              <th>Date</th>
              <th>Recipient (raw)</th>
              <th>Assistant</th>
              <th>Reference No</th>
              <th>Total USD</th>
              <th>Fee</th>
              <th>Total Amount</th>
              <th>Currency</th>
              <th>Total Recipient</th>
              <th>Exchange Rate</th>
              <th className={tableStyles.actCol}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={12}>Loading payments…</td>
              </tr>
            )}
            {!loading && displayed.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={12}>
                  {tab === 'unmatched' ? '✓ All payments are matched.' : 'No payments found.'}
                </td>
              </tr>
            )}
            {!loading && displayed.map(p => (
              <tr key={p.ID} data-id={p.ID}
                className={!p.assistant_id ? styles.unmatchedRow : ''}>
                <td className={tableStyles.stickyCol}
                  onClick={e => e.currentTarget.closest('tr').classList.toggle(tableStyles.selected)}>
                  {p.ID}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{p.Date || '—'}</td>
                <td>
                  <span className={styles.recipientRaw}>{p.Recipient || '—'}</span>
                </td>
                <td>
                  {p.assistant?.full_name
                    ? <span className={styles.matchedBadge}>{p.assistant.full_name}</span>
                    : <span className={styles.unmatchedBadge}>Unmatched</span>
                  }
                </td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)', fontSize: 12 }}>
                  {p['Reference No'] || '—'}
                </td>
                <td><strong>${fmtMoney(p['Total USD'])}</strong></td>
                <td style={{ color: 'var(--danger)' }}>${fmtMoney(p['Fee'])}</td>
                <td>${fmtMoney(p['Total Amount'])}</td>
                <td>{p['Currency'] || '—'}</td>
                <td><strong>{fmtMoney(p['Total Recipient'])}</strong></td>
                <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{p['Exchange Rate'] || '—'}</td>
                <td className={tableStyles.actCol}>
                  {!p.assistant_id && (
                    <button className={styles.assignBtn}
                      onClick={() => setAliasModal({ recipient_raw: p.Recipient })}>
                      Assign
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de asignación de alias */}
      <AliasModal
        open={!!aliasModal}
        recipientRaw={aliasModal?.recipient_raw}
        assistants={assistants}
        onClose={() => setAliasModal(null)}
        onSave={resolveAlias}
      />
    </div>
  );
}

/* ── Modal: asignar Recipient → Assistant ── */
function AliasModal({ open, recipientRaw, assistants, onClose, onSave }) {
  const [assistantId, setAssistantId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setAssistantId(''); }, [open]);

  const submit = async () => {
    setSaving(true);
    await onSave(recipientRaw, assistantId);
    setSaving(false);
  };

  return (
    <Modal open={open} title="Assign Payment" onClose={onClose} maxWidth={420}>
      <div className={styles.aliasInfo}>
        <div className={styles.aliasLabel}>Recipient in Remitly</div>
        <div className={styles.aliasValue}>"{recipientRaw}"</div>
        <div className={styles.aliasNote}>
          This will create a permanent alias. All future payments with this exact recipient name will resolve automatically.
        </div>
      </div>
      <Field label="Assign to Assistant">
        <Select value={assistantId} onChange={e => setAssistantId(e.target.value)}>
          <option value="">— Select assistant —</option>
          {assistants.map(a => (
            <option key={a.ID} value={a.ID}>{a.full_name}</option>
          ))}
        </Select>
      </Field>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>
          Save Alias
        </Button>
      </ModalActions>
    </Modal>
  );
}

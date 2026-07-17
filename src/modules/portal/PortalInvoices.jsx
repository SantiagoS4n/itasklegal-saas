import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fmtMoney } from '@/utils/format';
import { useSort } from '@/hooks/useSort';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { SortableTh } from '@/components/ui/index';
import { exportToCSV } from '@/utils/exportCSV';
import { Button } from '@/components/ui/index';
import tableStyles from '@/styles/table.module.css';
import styles from './Portal.module.css';

const ESTADO_LABEL = { pending: 'Pending', paid: 'Paid', overdue: 'Overdue' };
const ESTADO_CLASS = {
  pending: styles.estadoPendiente,
  paid:    styles.estadoPagada,
  overdue: styles.estadoVencida,
};

export function PortalInvoices() {
  const { firmId } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoice')
      .select('*')
      .eq('firm_id', firmId)
      .order('invoice_date', { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => { if (firmId) load(); }, [firmId]);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const { sorted, toggle, icon } = useSort(filtered, 'invoice_date', 'desc');
  const pagination = usePagination(sorted, 25);

  const total   = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const paid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const pending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Invoices</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${sorted.length} invoices`}</p>
        </div>
        <Button variant="ghost" onClick={() => exportToCSV(
          sorted,
          [
            { key: 'invoice_number', label: 'Invoice #' },
            { key: 'amount', label: 'Amount USD' },
            { key: 'status', label: 'Status' },
            { key: 'invoice_date', label: 'Invoice Date' },
            { key: 'start_date', label: 'Period Start' },
            { key: 'end_date', label: 'Period End' },
            { key: 'pdf_url', label: 'PDF Link' },
          ],
          'my_invoices'
        )}>
          ⬇ Export
        </Button>
      </div>

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
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <SortableTh sortKey="invoice_number" icon={icon} onToggle={toggle}>Invoice #</SortableTh>
              <SortableTh sortKey="amount"         icon={icon} onToggle={toggle}>Amount (USD)</SortableTh>
              <SortableTh sortKey="status"         icon={icon} onToggle={toggle}>Status</SortableTh>
              <SortableTh sortKey="invoice_date"   icon={icon} onToggle={toggle}>Invoice Date</SortableTh>
              <th>Period Start</th>
              <th>Period End</th>
              <th style={{ textAlign: 'center' }}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={5} cols={7} />}
            {!loading && sorted.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={7}>No invoices found.</td>
              </tr>
            )}
            {!loading && pagination.paginated.map(inv => (
              <tr key={inv.invoice_number}>
                <td className={tableStyles.bold} style={{ padding: '10px 8px' }}>{inv.invoice_number}</td>
                <td><strong>${fmtMoney(inv.amount)}</strong></td>
                <td>
                  <span className={`${styles.badge} ${ESTADO_CLASS[inv.status] || ''}`}>
                    {ESTADO_LABEL[inv.status] || inv.status}
                  </span>
                </td>
                <td>{inv.invoice_date || '—'}</td>
                <td>{inv.start_date || '—'}</td>
                <td>{inv.end_date || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  {inv.pdf_url
                    ? <a href={inv.pdf_url} target="_blank" rel="noreferrer" className={styles.pdfLink}>⬇ PDF</a>
                    : <span style={{ color: 'var(--text-3)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} />
    </div>
  );
}

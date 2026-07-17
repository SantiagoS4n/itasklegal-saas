import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fmtMoney } from '@/utils/format';
import { MonthFilter } from '@/components/ui/MonthFilter';
import styles from '@/modules/analytics/Analytics.module.css';

export function PortalAnalytics() {
  const { firmId } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [month,   setMonth]   = useState('');

  const load = async (m = month) => {
    setLoading(true);
    const params = m ? { p_month: m } : {};
    const { data: result, error } = await supabase.rpc('get_firm_analytics', params);
    if (!error) {
      const mine = (result || []).find(f => String(f.firm_id) === String(firmId));
      setData(mine || null);
    }
    setLoading(false);
  };

  useEffect(() => { if (firmId) load(month); }, [firmId, month]);

  if (loading) return (
    <div className={styles.centerState}>
      <div className={styles.spinner} />
      <p>Loading analytics…</p>
    </div>
  );

  if (!data) return (
    <div className={styles.centerState}>
      <p>No data available for this period.</p>
    </div>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Your Analytics</h1>
          <p className={styles.sub}>{month ? `Showing: ${monthLabel(month)}` : 'All-time overview'}</p>
        </div>
        <div className={styles.headerActions}>
          <MonthFilter value={month} onChange={setMonth} />
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard label="Active Assistants" value={data.active_assistants} />
        <KpiCard label="Total Invoiced" value={`$${fmtMoney(data.total_invoiced)}`} />
        <KpiCard label="Paid" value={`$${fmtMoney(data.invoiced_paid)}`} accent="success" />
        <KpiCard label="Pending" value={`$${fmtMoney(data.invoiced_pending)}`} accent="neutral" />
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard label="Overdue" value={`$${fmtMoney(data.invoiced_overdue)}`} accent={data.invoiced_overdue > 0 ? 'danger' : 'success'} />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent = 'neutral' }) {
  const accentMap = {
    neutral: '',
    success: styles.accentGreen,
    danger:  styles.accentRed,
  };
  return (
    <div className={`${styles.kpiCard} ${accentMap[accent]}`}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

function monthLabel(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
}

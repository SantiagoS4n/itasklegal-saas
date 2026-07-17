import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fmtMoney } from '@/utils/format';
import { MonthFilter } from '@/components/ui/MonthFilter';
import styles from '@/modules/analytics/Analytics.module.css';

export function PortalAnalytics() {
  const { firmId } = useAuth();
  const [data,    setData]    = useState(null);
  const [trend,   setTrend]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [month,   setMonth]   = useState('');
  const [hovered, setHovered] = useState(null);

  const load = async (m = month) => {
    setLoading(true);
    const params = m ? { p_month: m } : {};
    const [analyticsRes, invRes] = await Promise.all([
      supabase.rpc('get_firm_analytics', params),
      supabase.from('invoice')
        .select('amount, status, invoice_date')
        .eq('firm_id', firmId)
        .gte('invoice_date', new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]),
    ]);

    if (!analyticsRes.error) {
      const mine = (analyticsRes.data || []).find(f => String(f.firm_id) === String(firmId));
      setData(mine || null);
    }

    if (invRes.data) {
      const byMonth = {};
      invRes.data.forEach(inv => {
        if (!inv.invoice_date) return;
        const key = inv.invoice_date.slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { month_sort: key, paid: 0, total: 0 };
        byMonth[key].total += parseFloat(inv.amount) || 0;
        if (inv.status === 'paid') byMonth[key].paid += parseFloat(inv.amount) || 0;
      });
      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const arr = Object.values(byMonth)
        .sort((a, b) => a.month_sort.localeCompare(b.month_sort))
        .map(m => ({ ...m, month: `${names[parseInt(m.month_sort.slice(5,7),10)-1]} ${m.month_sort.slice(0,4)}` }));
      setTrend(arr);
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
          <h1 className={styles.title}>Analytics</h1>
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

      {trend.length > 0 && (
        <div className={styles.chartCardFull}>
          <div className={styles.chartTitle}>Monthly Invoicing (last 12 months)</div>
          <div className={styles.chartRelative}>
            {hovered && (
              <div className={styles.tooltip} style={{ left: `${hovered.x}%` }}>
                <div className={styles.tooltipMonth}>{hovered.month}</div>
                <div className={styles.tooltipValue}>${fmtMoney(hovered.value)}</div>
              </div>
            )}
            <div className={styles.monthChart}>
              {trend.map((d, i) => {
                const max = Math.max(...trend.map(t => t.total), 1);
                const h = (d.total / max) * 100;
                const xPct = ((i + 0.5) / trend.length) * 100;
                return (
                  <div
                    key={d.month}
                    className={styles.monthCol}
                    onMouseEnter={() => setHovered({ month: d.month, value: d.total, x: xPct })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className={styles.monthBars}>
                      <div className={styles.monthBarWrap}>
                        <div className={styles.monthBar} style={{ height: `${h}%`, background: 'var(--gold)' }} />
                      </div>
                    </div>
                    <div className={styles.monthLabel}>{d.month.split(' ')[0]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
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

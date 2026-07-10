import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { fmtMoney } from '@/utils/format';
import styles from './Analytics.module.css';

export function Analytics() {
  const toast   = useAppToast();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: result, error } = await supabase.rpc('get_crm_analytics');
    if (error) { toast('❌ ' + error.message, 'error'); setLoading(false); return; }
    setData(result);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState />;
  if (!data)   return <ErrorState onRetry={load} />;

  const { kpis, by_role, by_firm, invoices_by_month, payments_by_month, top_assistants_paid } = data;

  // Margen = facturado pagado - total enviado a asistentes
  const margin     = (kpis.invoiced_paid || 0) - (kpis.total_paid_usd || 0);
  const marginPct  = kpis.invoiced_paid
    ? ((margin / kpis.invoiced_paid) * 100).toFixed(1)
    : 0;

  return (
    <div className={styles.wrap}>

      {/* ── Título + refresh ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.sub}>Business overview</p>
        </div>
        <button className={styles.refreshBtn} onClick={load}>↺ Refresh</button>
      </div>

      {/* ── KPI Cards — fila 1 ── */}
      <div className={styles.kpiGrid}>
        <KpiCard label="Total Assistants"   value={kpis.total_assistants}   sub={`${kpis.contracted_assistants} contracted`} />
        <KpiCard label="Law Firms"          value={kpis.total_firms} />
        <KpiCard label="Business Cards"     value={kpis.total_bizcards} />
        <KpiCard label="Unmatched Payments" value={kpis.unmatched_payments}
          sub={kpis.unmatched_payments > 0 ? 'need assignment' : 'all matched ✓'}
          accent={kpis.unmatched_payments > 0 ? 'danger' : 'success'} />
      </div>

      {/* ── KPI Cards — fila 2: financiero ── */}
      <div className={styles.kpiGrid}>
        <KpiCard label="Total Invoiced"  value={`$${fmtMoney(kpis.total_invoiced)}`}  accent="neutral" />
        <KpiCard label="Invoiced Paid"   value={`$${fmtMoney(kpis.invoiced_paid)}`}   accent="success" />
        <KpiCard label="Total Sent Out"  value={`$${fmtMoney(kpis.total_paid_usd)}`}  accent="neutral" />
        <KpiCard
          label="Gross Margin"
          value={`$${fmtMoney(margin)}`}
          sub={`${marginPct}% of revenue`}
          accent={margin >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* ── Charts row ── */}
      <div className={styles.chartsRow}>

        {/* Asistentes por rol */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Assistants by Role</div>
          <BarChart
            data={(by_role || []).map(r => ({
              label: r.role,
              value: r.total,
              sub:   `${r.contracted} contracted`,
            }))}
            color="var(--gold)"
          />
        </div>

        {/* Asistentes por firma */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Assistants by Firm</div>
          <BarChart
            data={(by_firm || []).map(r => ({
              label: r.firm_name,
              value: r.total,
              sub:   `$${fmtMoney(r.invoice_total)} invoiced`,
            }))}
            color="#007af5"
          />
        </div>
      </div>

      {/* ── Invoice trend ── */}
      {invoices_by_month?.length > 0 && (
        <div className={styles.chartCardFull}>
          <div className={styles.chartTitle}>Monthly Invoicing (last 12 months)</div>
          <MonthlyChart
            data={invoices_by_month}
            barKey="total"
            lineKey="paid"
            barLabel="Invoiced"
            lineLabel="Paid"
            barColor="var(--gold)"
            lineColor="var(--success)"
            prefix="$"
          />
        </div>
      )}

      {/* ── Payments trend ── */}
      {payments_by_month?.length > 0 && (
        <div className={styles.chartCardFull}>
          <div className={styles.chartTitle}>Monthly Payments — Remitly (last 12 months)</div>
          <MonthlyChart
            data={payments_by_month}
            barKey="total_usd"
            lineKey="total_fee"
            barLabel="Sent USD"
            lineLabel="Fees"
            barColor="#007af5"
            lineColor="var(--danger)"
            prefix="$"
          />
        </div>
      )}

      {/* ── Top assistants ── */}
      {top_assistants_paid?.length > 0 && (
        <div className={styles.tableCard}>
          <div className={styles.chartTitle}>Top Assistants by Payment Volume</div>
          <table className={styles.detailTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Assistant</th>
                <th>Transfers</th>
                <th>Total USD Sent</th>
                <th>Total Received</th>
              </tr>
            </thead>
            <tbody>
              {top_assistants_paid.map((a, i) => (
                <tr key={a.full_name}>
                  <td className={styles.rank}>{i + 1}</td>
                  <td className={styles.name}>{a.full_name}</td>
                  <td>{a.transfers}</td>
                  <td><strong>${fmtMoney(a.total_usd)}</strong></td>
                  <td>{fmtMoney(a.total_recipient)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════
   Sub-componentes
══════════════════════════════════ */

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

function BarChart({ data = [], color }) {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className={styles.barChart}>
      {data.map(d => (
        <div key={d.label} className={styles.barRow}>
          <div className={styles.barLabel}>{d.label}</div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          <div className={styles.barValue}>{d.value}</div>
          {d.sub && <div className={styles.barSub}>{d.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ data = [], barKey, lineKey, barLabel, lineLabel, barColor, lineColor, prefix = '' }) {
  if (!data.length) return <EmptyChart />;
  const maxBar  = Math.max(...data.map(d => d[barKey]  || 0), 1);
  const maxLine = Math.max(...data.map(d => d[lineKey] || 0), 1);

  return (
    <div>
      <div className={styles.monthChart}>
        {data.map(d => {
          const barH  = ((d[barKey]  || 0) / maxBar)  * 100;
          const lineH = ((d[lineKey] || 0) / maxLine) * 100;
          return (
            <div key={d.month} className={styles.monthCol}>
              <div className={styles.monthBars}>
                <div className={styles.monthBarWrap} title={`${barLabel}: ${prefix}${fmtMoney(d[barKey])}`}>
                  <div className={styles.monthBar} style={{ height: `${barH}%`, background: barColor }} />
                </div>
                <div className={styles.monthBarWrap} title={`${lineLabel}: ${prefix}${fmtMoney(d[lineKey])}`}>
                  <div className={styles.monthBar} style={{ height: `${lineH}%`, background: lineColor, opacity: 0.7 }} />
                </div>
              </div>
              <div className={styles.monthLabel}>{d.month?.slice(5)}</div>
            </div>
          );
        })}
      </div>
      <div className={styles.chartLegend}>
        <span><span className={styles.legendDot} style={{ background: barColor }} />{barLabel}</span>
        <span><span className={styles.legendDot} style={{ background: lineColor }} />{lineLabel}</span>
      </div>
    </div>
  );
}

function EmptyChart() {
  return <div className={styles.emptyChart}>No data yet</div>;
}

function LoadingState() {
  return (
    <div className={styles.centerState}>
      <div className={styles.spinner} />
      <p>Loading analytics…</p>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className={styles.centerState}>
      <p>Failed to load analytics.</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}

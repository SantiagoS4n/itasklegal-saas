import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { fmtMoney } from '@/utils/format';
import styles from './Analytics.module.css';

export function Analytics() {
  const toast   = useAppToast();
  const [data,     setData]     = useState(null);
  const [firmData, setFirmData] = useState([]);
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    const [globalRes, firmRes] = await Promise.all([
      supabase.rpc('get_crm_analytics'),
      supabase.rpc('get_firm_analytics'),
    ]);
    if (globalRes.error) { toast('❌ ' + globalRes.error.message, 'error'); setLoading(false); return; }
    setData(globalRes.data);
    if (!firmRes.error) setFirmData(firmRes.data || []);
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
          <div className={styles.chartTitle}>Contracted Assistants by Firm</div>
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
          <div className={styles.chartTitle}>Monthly Paid Invoices (last 12 months)</div>
          <MonthlyChart
            data={invoices_by_month}
            barKey="paid"
            barLabel="Paid"
            barColor="var(--success)"
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
            barLabel="Sent USD"
            barColor="#007af5"
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

      {/* ══ Analytics por Firma ══ */}
      {firmData.length > 0 && (
        <div className={styles.tableCard}>
          <div className={styles.chartTitle}>Performance by Firm</div>
          <table className={styles.firmTable}>
            <thead>
              <tr>
                <th>Firm</th>
                <th style={{ textAlign: 'center' }}>Active</th>
                <th style={{ textAlign: 'right' }}>Invoiced</th>
                <th style={{ textAlign: 'right' }}>Collected</th>
                <th style={{ textAlign: 'right' }}>Paid Out</th>
                <th style={{ textAlign: 'right' }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {firmData.map(f => {
                const marginPct = f.invoiced_paid
                  ? ((f.gross_margin / f.invoiced_paid) * 100).toFixed(0)
                  : 0;
                return (
                  <tr
                    key={f.firm_id}
                    className={`${styles.firmRow} ${selectedFirm?.firm_id === f.firm_id ? styles.firmRowActive : ''}`}
                    onClick={() => setSelectedFirm(selectedFirm?.firm_id === f.firm_id ? null : f)}>
                    <td className={styles.name}>{f.firm_name}</td>
                    <td style={{ textAlign: 'center' }}>{f.active_assistants}/{f.total_assistants}</td>
                    <td style={{ textAlign: 'right' }}>${fmtMoney(f.total_invoiced)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)' }}>${fmtMoney(f.invoiced_paid)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>${fmtMoney(f.total_paid_out)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong style={{ color: f.gross_margin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        ${fmtMoney(f.gross_margin)}
                      </strong>
                      <span className={styles.marginPct}>{marginPct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Detalle de la firma seleccionada */}
          {selectedFirm && (
            <div className={styles.firmDetail}>
              <div className={styles.firmDetailHeader}>
                <h3>{selectedFirm.firm_name}</h3>
                <button onClick={() => setSelectedFirm(null)}>✕ Close</button>
              </div>
              <div className={styles.firmDetailGrid}>
                <DetailStat label="Total Assistants" value={selectedFirm.total_assistants} />
                <DetailStat label="Active" value={selectedFirm.active_assistants} accent="gold" />
                <DetailStat label="Total Invoiced" value={`$${fmtMoney(selectedFirm.total_invoiced)}`} />
                <DetailStat label="Collected" value={`$${fmtMoney(selectedFirm.invoiced_paid)}`} accent="success" />
                <DetailStat label="Pending" value={`$${fmtMoney(selectedFirm.invoiced_pending)}`} accent="warning" />
                <DetailStat label="Overdue" value={`$${fmtMoney(selectedFirm.invoiced_overdue)}`} accent={selectedFirm.invoiced_overdue > 0 ? 'danger' : 'neutral'} />
                <DetailStat label="Paid to Assistants" value={`$${fmtMoney(selectedFirm.total_paid_out)}`} />
                <DetailStat label="Gross Margin" value={`$${fmtMoney(selectedFirm.gross_margin)}`} accent={selectedFirm.gross_margin >= 0 ? 'success' : 'danger'} />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function DetailStat({ label, value, accent = 'neutral' }) {
  const accentColor = {
    neutral: 'var(--text)',
    gold:    'var(--gold-dark)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger:  'var(--danger)',
  }[accent];
  return (
    <div className={styles.detailStat}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue} style={{ color: accentColor }}>{value}</div>
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
  const hasLine = !!lineKey;
  const maxBar  = Math.max(...data.map(d => d[barKey]  || 0), 1);
  const maxLine = hasLine ? Math.max(...data.map(d => d[lineKey] || 0), 1) : 1;

  // Etiqueta de mes: "Jul 2026" → "Jul"
  const shortMonth = (m) => (m || '').split(' ')[0];

  return (
    <div>
      <div className={styles.monthChart}>
        {data.map(d => {
          const barH  = ((d[barKey]  || 0) / maxBar)  * 100;
          const lineH = hasLine ? ((d[lineKey] || 0) / maxLine) * 100 : 0;
          return (
            <div key={d.month} className={styles.monthCol}>
              <div className={styles.monthBars}>
                <div className={styles.monthBarWrap} title={`${barLabel}: ${prefix}${fmtMoney(d[barKey])}`}>
                  <div className={styles.monthBar} style={{ height: `${barH}%`, background: barColor }} />
                </div>
                {hasLine && (
                  <div className={styles.monthBarWrap} title={`${lineLabel}: ${prefix}${fmtMoney(d[lineKey])}`}>
                    <div className={styles.monthBar} style={{ height: `${lineH}%`, background: lineColor, opacity: 0.7 }} />
                  </div>
                )}
              </div>
              <div className={styles.monthLabel} title={d.month}>{shortMonth(d.month)}</div>
            </div>
          );
        })}
      </div>
      <div className={styles.chartLegend}>
        <span><span className={styles.legendDot} style={{ background: barColor }} />{barLabel}</span>
        {hasLine && <span><span className={styles.legendDot} style={{ background: lineColor }} />{lineLabel}</span>}
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

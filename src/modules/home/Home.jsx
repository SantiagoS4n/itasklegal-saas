import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAppToast } from '@/components/layout/AppLayout';
import { fmtMoney } from '@/utils/format';
import styles from './Home.module.css';

export function Home() {
  const { displayName } = useAuth();
  const toast    = useAppToast();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const in7   = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';

    const [
      asRes, firmRes, invRes, remRes, upcomingRes, monthInvRes, monthPayRes
    ] = await Promise.all([
      supabase.from('assistant').select('ID, contracted'),
      supabase.from('law_firm').select('ID_number'),
      supabase.from('invoice').select('amount, status'),
      supabase.from('remitly').select('ID', { count: 'exact' }).is('assistant_id', null),
      supabase.from('invoice')
        .select('invoice_number, amount, invoice_date, law_firm(firm_name)')
        .eq('status', 'pending')
        .lte('invoice_date', in7)
        .gte('invoice_date', today)
        .order('invoice_date')
        .limit(5),
      supabase.from('invoice')
        .select('amount, status')
        .gte('invoice_date', monthStart),
      supabase.from('remitly')
        .select('"Total USD"')
        .gte('"Date"', monthStart),
    ]);

    const assistants   = asRes.data    || [];
    const invoices     = invRes.data   || [];
    const monthInv     = monthInvRes.data || [];
    const monthPay     = monthPayRes.data || [];

    const active       = assistants.filter(a => a.contracted === 'Yes').length;
    const candidates   = assistants.filter(a => a.contracted !== 'Yes').length;
    const totalFirms   = (firmRes.data || []).length;
    const unmatched    = remRes.count || 0;

    const totalInvoiced  = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalPaid      = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalPending   = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalOverdue   = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    const monthBilled    = monthInv.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const monthCollected = monthInv.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const monthSent      = monthPay.reduce((s, i) => s + (parseFloat(i['Total USD']) || 0), 0);
    const monthMargin    = monthCollected - monthSent;

    setData({
      active, candidates, totalFirms, unmatched,
      totalInvoiced, totalPaid, totalPending, totalOverdue,
      monthBilled, monthCollected, monthSent, monthMargin,
      upcoming: upcomingRes.data || [],
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p>Loading dashboard…</p>
    </div>
  );

  return (
    <div className={styles.wrap}>

      {/* Greeting */}
      <div className={styles.greeting}>
        <h1 className={styles.greetTitle}>{greeting}, {displayName} 👋</h1>
        <p className={styles.greetSub}>Here's what's happening today</p>
        <button className={styles.refreshBtn} onClick={load}>↺ Refresh</button>
      </div>

      {/* Alertas */}
      {(data.unmatched > 0 || data.totalOverdue > 0) && (
        <div className={styles.alertRow}>
          {data.unmatched > 0 && (
            <div className={`${styles.alert} ${styles.alertWarn}`} onClick={() => navigate('/payments')}>
              ⚠️ <strong>{data.unmatched}</strong> unmatched payment{data.unmatched > 1 ? 's' : ''} in Remitly — click to resolve
            </div>
          )}
          {data.totalOverdue > 0 && (
            <div className={`${styles.alert} ${styles.alertDanger}`} onClick={() => navigate('/invoices')}>
              🔴 <strong>${fmtMoney(data.totalOverdue)}</strong> in overdue invoices — click to review
            </div>
          )}
        </div>
      )}

      {/* KPI fila 1 — People */}
      <div className={styles.sectionLabel}>Team</div>
      <div className={styles.kpiGrid}>
        <KpiCard icon="👤" label="Active Assistants" value={data.active} sub={`${data.candidates} candidates`} accent="gold" onClick={() => navigate('/assistants')} />
        <KpiCard icon="⚖️" label="Law Firms" value={data.totalFirms} sub="client firms" onClick={() => navigate('/law-firms')} />
        <KpiCard icon="💸" label="Unmatched Payments" value={data.unmatched} sub={data.unmatched > 0 ? 'need assignment' : 'all matched ✓'} accent={data.unmatched > 0 ? 'danger' : 'success'} onClick={() => navigate('/payments')} />
        <KpiCard icon="📊" label="This Month Margin" value={`$${fmtMoney(data.monthMargin)}`} sub={`$${fmtMoney(data.monthCollected)} collected — $${fmtMoney(data.monthSent)} sent`} accent={data.monthMargin >= 0 ? 'success' : 'danger'} onClick={() => navigate('/analytics')} />
      </div>

      {/* KPI fila 2 — Finance */}
      <div className={styles.sectionLabel}>Invoices</div>
      <div className={styles.kpiGrid}>
        <KpiCard icon="🧾" label="Total Invoiced" value={`$${fmtMoney(data.totalInvoiced)}`} sub="all time" onClick={() => navigate('/invoices')} />
        <KpiCard icon="✅" label="Collected" value={`$${fmtMoney(data.totalPaid)}`} sub="paid invoices" accent="success" onClick={() => navigate('/invoices')} />
        <KpiCard icon="⏳" label="Pending" value={`$${fmtMoney(data.totalPending)}`} sub="awaiting payment" accent="warning" onClick={() => navigate('/invoices')} />
        <KpiCard icon="🔴" label="Overdue" value={`$${fmtMoney(data.totalOverdue)}`} sub="past due date" accent={data.totalOverdue > 0 ? 'danger' : 'success'} onClick={() => navigate('/invoices')} />
      </div>

      {/* Upcoming invoices */}
      {data.upcoming.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Invoices due in next 7 days</div>
          <div className={styles.upcomingCard}>
            {data.upcoming.map(inv => (
              <div key={inv.invoice_number} className={styles.upcomingRow} onClick={() => navigate('/invoices')}>
                <div className={styles.upcomingLeft}>
                  <span className={styles.upcomingNumber}>#{inv.invoice_number}</span>
                  <span className={styles.upcomingFirm}>{inv.law_firm?.firm_name || '—'}</span>
                </div>
                <div className={styles.upcomingRight}>
                  <span className={styles.upcomingAmount}>${fmtMoney(inv.amount)}</span>
                  <span className={styles.upcomingDate}>{inv.invoice_date}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent = 'neutral', onClick }) {
  const accentClass = {
    neutral: '',
    gold:    styles.accentGold,
    success: styles.accentGreen,
    danger:  styles.accentRed,
    warning: styles.accentYellow,
  }[accent] || '';

  return (
    <div className={`${styles.kpiCard} ${accentClass} ${onClick ? styles.clickable : ''}`} onClick={onClick}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

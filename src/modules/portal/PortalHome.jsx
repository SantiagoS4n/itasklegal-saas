import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fmtMoney } from '@/utils/format';
import styles from '@/modules/home/Home.module.css';

export function PortalHome() {
  const { displayName, firmId } = useAuth();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [asRes, invRes] = await Promise.all([
      supabase.from('assistant').select('ID, contracted').eq('firm_id', firmId),
      supabase.from('invoice').select('amount, status, invoice_date').eq('firm_id', firmId),
    ]);

    const assistants = asRes.data || [];
    const invoices    = invRes.data || [];

    const active = assistants.filter(a => a.contracted === 'Yes').length;

    const totalInvoiced = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalPaid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalPending  = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalOverdue  = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    const upcoming = invoices
      .filter(i => i.status === 'pending')
      .sort((a, b) => (a.invoice_date || '').localeCompare(b.invoice_date || ''))
      .slice(0, 5);

    setData({ active, totalInvoiced, totalPaid, totalPending, totalOverdue, upcoming });
    setLoading(false);
  };

  useEffect(() => { if (firmId) load(); }, [firmId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading || !data) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p>Loading your dashboard…</p>
    </div>
  );

  return (
    <div className={styles.wrap}>

      <div className={styles.greeting}>
        <h1 className={styles.greetTitle}>{greeting}, {displayName} 👋</h1>
        <p className={styles.greetSub}>Firm summary</p>
        <button className={styles.refreshBtn} onClick={load}>↺ Refresh</button>
      </div>

      {data.totalOverdue > 0 && (
        <div className={styles.alertRow}>
          <div className={`${styles.alert} ${styles.alertDanger}`} onClick={() => navigate('/portal/invoices')}>
            🔴 <strong>${fmtMoney(data.totalOverdue)}</strong> in overdue invoices — click to review
          </div>
        </div>
      )}

      <div className={styles.sectionLabel}>Overview</div>
      <div className={styles.kpiGrid}>
        <KpiCard icon="👤" label="Active Assistants" value={data.active} onClick={() => navigate('/portal/assistants')} />
        <KpiCard icon="🧾" label="Total Invoiced" value={`$${fmtMoney(data.totalInvoiced)}`} onClick={() => navigate('/portal/invoices')} />
        <KpiCard icon="✅" label="Paid" value={`$${fmtMoney(data.totalPaid)}`} accent="success" onClick={() => navigate('/portal/invoices')} />
        <KpiCard icon="⏳" label="Pending" value={`$${fmtMoney(data.totalPending)}`} accent="warning" onClick={() => navigate('/portal/invoices')} />
      </div>

      {data.upcoming.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Pending Invoices</div>
          <div className={styles.upcomingCard}>
            {data.upcoming.map((inv, i) => (
              <div key={i} className={styles.upcomingRow} onClick={() => navigate('/portal/invoices')}>
                <div className={styles.upcomingLeft}>
                  <span className={styles.upcomingFirm}>{inv.invoice_date || 'No date'}</span>
                </div>
                <div className={styles.upcomingRight}>
                  <span className={styles.upcomingAmount}>${fmtMoney(inv.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}

function KpiCard({ icon, label, value, accent = 'neutral', onClick }) {
  const accentClass = {
    neutral: '',
    success: styles.accentGreen,
    warning: styles.accentYellow,
    danger:  styles.accentRed,
  }[accent] || '';

  return (
    <div className={`${styles.kpiCard} ${accentClass} ${onClick ? styles.clickable : ''}`} onClick={onClick}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
    </div>
  );
}

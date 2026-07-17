import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fmtMoney, safeUrl } from '@/utils/format';
import { useSort } from '@/hooks/useSort';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { SortableTh } from '@/components/ui/index';
import tableStyles from '@/styles/table.module.css';
import styles from './Portal.module.css';

const ROLE_CLASS = {
  'Paralegal':         tableStyles.roleParalegal,
  'Virtual Assistant': tableStyles.roleVA,
  'Case Manager':      tableStyles.roleCM,
};

export function PortalAssistants() {
  const { firmId } = useAuth();
  const [assistants, setAssistants] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('assistant')
      .select('*')
      .eq('firm_id', firmId)
      .eq('contracted', 'Yes')
      .order('full_name');
    setAssistants(data || []);
    setLoading(false);
  };

  useEffect(() => { if (firmId) load(); }, [firmId]);

  const { sorted, toggle, icon } = useSort(assistants, 'full_name', 'asc');
  const pagination = usePagination(sorted, 25);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assistants</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${assistants.length} active`}</p>
        </div>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <SortableTh sortKey="full_name" icon={icon} onToggle={toggle}>Name</SortableTh>
              <SortableTh sortKey="role"      icon={icon} onToggle={toggle}>Role</SortableTh>
              <SortableTh sortKey="email"     icon={icon} onToggle={toggle}>Email</SortableTh>
              <SortableTh sortKey="phone"     icon={icon} onToggle={toggle}>Phone</SortableTh>
              <SortableTh sortKey="city"      icon={icon} onToggle={toggle}>City</SortableTh>
              <SortableTh sortKey="start_date" icon={icon} onToggle={toggle}>Start Date</SortableTh>
              <SortableTh sortKey="hour"      icon={icon} onToggle={toggle}>Hours</SortableTh>
              <th style={{ textAlign: 'center' }}>CV</th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={5} cols={8} />}
            {!loading && sorted.length === 0 && (
              <tr className={tableStyles.stateRow}>
                <td colSpan={8}>No assistants assigned yet.</td>
              </tr>
            )}
            {!loading && pagination.paginated.map(a => {
              const cvUrl = safeUrl(a.link_CV);
              return (
                <tr key={a.ID}>
                  <td className={tableStyles.bold} style={{ padding: '10px 8px' }}>{a.full_name}</td>
                  <td>
                    <span className={`${tableStyles.selInput} ${ROLE_CLASS[a.role] || ''}`} style={{ display: 'inline-block', cursor: 'default' }}>
                      {a.role || '—'}
                    </span>
                  </td>
                  <td>{a.email || '—'}</td>
                  <td>{a.phone || '—'}</td>
                  <td>{a.city || '—'}</td>
                  <td>{a.start_date || '—'}</td>
                  <td>{a.hour ?? '—'}</td>
                  <td className={tableStyles.linkCell} style={{ textAlign: 'center' }}>
                    {cvUrl
                      ? <a href={cvUrl} target="_blank" rel="noreferrer">View CV</a>
                      : <span className={tableStyles.noLink}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} />
    </div>
  );
}

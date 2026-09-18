import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAppToast } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Textarea, ModalGrid, ModalActions, SortableTh } from '@/components/ui/index';
import { useSort } from '@/hooks/useSort';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import tableStyles from '@/styles/table.module.css';
import { exportToCSV } from '@/utils/exportCSV';
import { CreateFirmUserModal } from '@/modules/bizcards/CreateFirmUserModal';
import styles from './BizCards.module.css';

const EMPTY = { full_name:'', company:'', job_title:'', email:'', phone_office:'', phone_fax:'', website:'', address:'', city:'', state:'', country:'', notes:'', source_file:'' };

/**
 * Menú "⋮" para acciones secundarias de fila (poco usadas) — ahorra espacio
 * en móvil. Se dibuja con un portal en <body> con posición fija calculada,
 * porque la tabla tiene overflow-x:auto y eso recorta cualquier dropdown
 * que intente salirse de esa caja (sin importar el z-index).
 */
function RowMenu({ children }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  const openMenu = () => {
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.right });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDocMouseDown = e => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} className={styles.rowMenuBtn} onClick={() => (open ? setOpen(false) : openMenu())} title="More actions">⋮</button>
      {open && createPortal(
        <div
          ref={menuRef}
          className={styles.rowMenuDropdown}
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

export function BizCards() {
  const toast = useAppToast();
  const [cards,   setCards]   = useState([]);
  const [firms,   setFirms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState({ open: false, data: null });
  const [firmModal, setFirmModal] = useState({ open: false, card: null });
  const [search,  setSearch]  = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [tab, setTab] = useState('contacts'); // 'contacts' | 'history'
  const [emailCounts, setEmailCounts] = useState(new Map()); // bussinescard_id -> { count, lastSentAt }

  const load = async () => {
    setLoading(true);
    const [cardsRes, firmsRes, logsRes] = await Promise.all([
      supabase.from('bussinescard').select('*, law_firm(firm_name)').order('ID'),
      supabase.from('law_firm').select('ID_number, firm_name').order('firm_name'),
      supabase.from('email_log').select('bussinescard_id, sent_at').eq('status', 'sent'),
    ]);
    if (cardsRes.error) toast('❌ ' + cardsRes.error.message, 'error');
    else setCards(cardsRes.data);
    if (!firmsRes.error) setFirms(firmsRes.data);
    if (!logsRes.error) {
      const counts = new Map();
      for (const l of logsRes.data) {
        const prev = counts.get(l.bussinescard_id);
        const isNewer = !prev || new Date(l.sent_at) > new Date(prev.lastSentAt);
        counts.set(l.bussinescard_id, {
          count: (prev?.count || 0) + 1,
          lastSentAt: isNewer ? l.sent_at : prev.lastSentAt,
        });
      }
      setEmailCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Memoizado para que no se recalcule (ni rompa la memoización del sort de
  // abajo) en renders que no tocan `cards`/`search` — por ejemplo, al abrir
  // el menú "⋮" de una fila.
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cards.filter(c =>
      !q || (c.full_name||'').toLowerCase().includes(q) || (c.company||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.job_title||'').toLowerCase().includes(q) || (c.notes||'').toLowerCase().includes(q)
    );
  }, [cards, search]);

  const { sorted, toggle, icon } = useSort(filtered, 'ID', 'desc');
  const pagination = usePagination(sorted, 25);

  // Selección para envío de correo masivo — cubre todos los contactos que
  // coinciden con el filtro/orden actual, no solo la página visible.
  const allSelected = sorted.length > 0 && sorted.every(c => selected.has(c.ID));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(sorted.map(c => c.ID)));
  const toggleOne = id => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectedCards = sorted.filter(c => selected.has(c.ID));
  const toggleSelectMode = () => {
    setSelectMode(m => !m);
    setSelected(new Set());
  };

  const handleDelete = async (card) => {
    const cardId = card.ID ?? card.id;
    if (cardId === null || cardId === undefined) {
      toast('❌ Cannot delete: this card has no ID', 'error');
      return;
    }
    const label = card.full_name ? `"${card.full_name}" (card #${cardId})` : `card #${cardId}`;
    if (!confirm(`Delete ${label}?`)) return;

    const { data, error } = await supabase.from('bussinescard').delete().eq('ID', cardId).select();
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    if (!data || data.length === 0) {
      toast('⚠️ Nothing was deleted — check RLS policy or ID', 'warning');
      return;
    }
    toast('✓ Card deleted');
    load();
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Business Cards</h1>
          <p className={styles.count}>{loading ? 'Loading…' : `${sorted.length} contacts`}</p>
        </div>
        {tab === 'contacts' && (
          <div className={styles.actions}>
            <input className={styles.search} type="text" placeholder="🔍  Search name, company, email, notes…" value={search} onChange={e => setSearch(e.target.value)} />
            <Button variant={selectMode ? 'dark' : 'ghost'} onClick={toggleSelectMode}>
              {selectMode ? '✕ Cancel' : '☑ Select'}
            </Button>
            {selectMode && selected.size > 0 && (
              <Button variant="dark" onClick={() => setEmailModal(true)}>✉ Send Email ({selected.size})</Button>
            )}
            <Button variant="ghost" onClick={() => exportToCSV(
              sorted,
              [
                { key: 'full_name', label: 'Name' },
                { key: 'company', label: 'Company' },
                { key: 'job_title', label: 'Job Title' },
                { key: 'email', label: 'Email' },
                { key: 'phone_office', label: 'Phone Office' },
                { key: 'phone_fax', label: 'Phone Fax' },
                { key: 'website', label: 'Website' },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State' },
                { key: 'country', label: 'Country' },
                { key: 'address', label: 'Address' },
                { key: 'notes', label: 'Notes' },
                { key: 'law_firm.firm_name', label: 'Linked Firm' },
              ],
              'business_cards'
            )}>
              ⬇ Export
            </Button>
            <Button variant="dark" onClick={() => setModal({ open: true, data: null })}>+ New Card</Button>
          </div>
        )}
      </div>

      <div className={styles.filterRow}>
        <button className={`${styles.filterTab} ${tab === 'contacts' ? styles.filterActive : ''}`} onClick={() => setTab('contacts')}>
          Contacts <span className={styles.filterCount}>{cards.length}</span>
        </button>
        <button className={`${styles.filterTab} ${tab === 'history' ? styles.filterActive : ''}`} onClick={() => setTab('history')}>
          ✉ Email History
        </button>
      </div>

      {tab === 'contacts' && (
        <>
          <div className={tableStyles.tableWrap}>
            <table className={tableStyles.table} style={{ minWidth: 1650 }}>
              <thead>
                <tr>
                  <SortableTh sortKey="ID"           icon={icon} onToggle={toggle} className={tableStyles.stickyCol}>
                    {selectMode ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} onClick={e => e.stopPropagation()} />
                        ID
                      </span>
                    ) : 'ID'}
                  </SortableTh>
                  <SortableTh sortKey="full_name"    icon={icon} onToggle={toggle}>Name</SortableTh>
                  <SortableTh sortKey="company"      icon={icon} onToggle={toggle}>Company</SortableTh>
                  <SortableTh sortKey="job_title"    icon={icon} onToggle={toggle}>Job Title</SortableTh>
                  <SortableTh sortKey="email"        icon={icon} onToggle={toggle}>Email</SortableTh>
                  <SortableTh sortKey="phone_office" icon={icon} onToggle={toggle}>Phone Office</SortableTh>
                  <th>Website</th>
                  <SortableTh sortKey="city"         icon={icon} onToggle={toggle}>City</SortableTh>
                  <SortableTh sortKey="country"      icon={icon} onToggle={toggle}>Country</SortableTh>
                  <th>Notes</th>
                  <SortableTh sortKey="law_firm.firm_name" icon={icon} onToggle={toggle}>Linked Firm</SortableTh>
                  <th className={tableStyles.actCol}></th>
                </tr>
              </thead>
              <tbody>
                {loading && <TableSkeleton rows={8} cols={12} />}
                {!loading && sorted.length === 0 && <tr className={tableStyles.stateRow}><td colSpan={12}>{search ? 'No results.' : 'No cards yet.'}</td></tr>}
                {!loading && pagination.paginated.map(c => (
                  <tr key={c.ID}>
                    <td className={tableStyles.stickyCol}>
                      {selectMode ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input type="checkbox" checked={selected.has(c.ID)} onChange={() => toggleOne(c.ID)} />
                          {c.ID}
                        </span>
                      ) : c.ID}
                    </td>
                    <td className={tableStyles.bold} style={{ padding: '10px 8px' }}>
                      {c.full_name || '—'}
                      {emailCounts.get(c.ID) && (
                        <span className={styles.emailCount}>
                          ✉ {emailCounts.get(c.ID).count} · {new Date(emailCounts.get(c.ID).lastSentAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td>{c.company || '—'}</td>
                    <td>{c.job_title || '—'}</td>
                    <td>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className={styles.emailLink}>
                          {c.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td>
                      {c.phone_office ? (
                        <a href={`tel:${c.phone_office}`} className={styles.phoneLink}>
                          {c.phone_office}
                        </a>
                      ) : '—'}
                    </td>
                    <td>{c.website || '—'}</td>
                    <td>{c.city || '—'}</td>
                    <td>{c.country || '—'}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes || '—'}</td>
                    <td>{c.law_firm?.firm_name || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                    <td className={tableStyles.actCol}>
                      <div style={{ display:'flex', gap:6, justifyContent:'center', alignItems: 'center' }}>
                        <button className={styles.editBtn} onClick={() => setModal({ open: true, data: c })}>Edit</button>
                        <RowMenu>
                          {c.firm_id
                            ? <div className={styles.rowMenuItem} style={{ color: 'var(--success)', cursor: 'default' }}>✓ Has portal access</div>
                            : <button className={styles.rowMenuItem} onClick={() => setFirmModal({ open: true, card: c })}>🔑 Portal Access</button>
                          }
                          <button className={styles.rowMenuItem} style={{ color: 'var(--danger)' }} onClick={() => handleDelete(c)}>✕ Delete</button>
                        </RowMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination {...pagination} />
        </>
      )}

      {tab === 'history' && <EmailHistoryTable toast={toast} />}

      <BizCardModal open={modal.open} initial={modal.data} onClose={() => setModal({ open: false, data: null })} onSaved={() => { setModal({ open: false, data: null }); load(); }} />

      <SendEmailModal
        open={emailModal}
        cards={selectedCards}
        toast={toast}
        onClose={() => setEmailModal(false)}
        onSent={() => { setEmailModal(false); setSelected(new Set()); }}
      />

      <CreateFirmUserModal
        open={firmModal.open}
        card={firmModal.card}
        firms={firms}
        toast={toast}
        onClose={() => setFirmModal({ open: false, card: null })}
        onDone={() => { setFirmModal({ open: false, card: null }); load(); }}
      />
    </div>
  );
}

const DEFAULT_SUBJECT = 'Reconectemos — iTaskLegal';
const DEFAULT_BODY = `Hola {{full_name}},

Fue un gusto coincidir contigo. Quería retomar el contacto y contarte un poco más sobre cómo trabajamos en iTaskLegal.

Quedo atento a cualquier pregunta.

Saludos,
Santiago`;

/**
 * Modal de envío de correo para Business Cards.
 * Envía uno o varios contactos a un webhook de n8n, que vuelve a leer
 * los datos frescos de Supabase, personaliza el mensaje por contacto
 * (placeholders {{full_name}}, {{company}}, {{job_title}}) y lo envía
 * por SMTP, dejando registro en `email_log`.
 */
const KNOWN_PLACEHOLDERS = ['full_name', 'company', 'job_title'];

// Reemplaza los placeholders conocidos con los datos del contacto — igual
// que hace n8n — para poder previsualizar el correo antes de enviarlo.
function renderTemplate(str, card) {
  return KNOWN_PLACEHOLDERS.reduce((acc, key) => acc.replaceAll(`{{${key}}}`, card[key] || ''), str);
}

// Cualquier {{...}} que sobreviva al reemplazo es un placeholder mal escrito
// o no soportado — nunca se va a rellenar, así que se le avisa al usuario.
function findLeftoverPlaceholders(str) {
  return [...new Set([...str.matchAll(/\{\{[^}]*\}\}/g)].map(m => m[0]))];
}

function SendEmailModal({ open, cards, onClose, onSent, toast }) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body,    setBody]    = useState(DEFAULT_BODY);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (open) { setSubject(DEFAULT_SUBJECT); setBody(DEFAULT_BODY); setPreview(false); }
  }, [open]);

  const withEmail    = cards.filter(c => c.email);
  const withoutEmail = cards.length - withEmail.length;
  const previewCard  = withEmail[0];
  const renderedSubject = previewCard ? renderTemplate(subject, previewCard) : subject;
  const renderedBody    = previewCard ? renderTemplate(body, previewCard) : body;
  const leftover = [...new Set([...findLeftoverPlaceholders(renderedSubject), ...findLeftoverPlaceholders(renderedBody)])];

  const goToPreview = () => {
    if (!subject.trim() || !body.trim()) { toast('⚠️ Subject and message are required', 'warning'); return; }
    if (withEmail.length === 0) { toast('⚠️ None of the selected contacts have an email on file', 'warning'); return; }
    setPreview(true);
  };

  const send = async () => {
    const webhookUrl = import.meta.env.VITE_N8N_BIZCARD_EMAIL_WEBHOOK;
    if (!webhookUrl) {
      toast('❌ Webhook not configured (VITE_N8N_BIZCARD_EMAIL_WEBHOOK)', 'error');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-token': import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',
        },
        body: JSON.stringify({
          ids: withEmail.map(c => c.ID),
          subject,
          body,
        }),
      });
      setSending(false);
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.error) {
        toast('❌ ' + (result.error || `Webhook responded ${res.status}`), 'error');
        return;
      }
      toast(`✓ Sending ${withEmail.length} email${withEmail.length === 1 ? '' : 's'} — n8n is processing`);
      onSent();
    } catch (err) {
      setSending(false);
      toast('❌ Could not reach n8n: ' + err.message, 'error');
    }
  };

  return (
    <Modal open={open} title={preview ? 'Preview Email' : 'Send Email'} onClose={onClose} maxWidth={620}>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>
        {withEmail.length} recipient{withEmail.length === 1 ? '' : 's'} will receive this message
        {withoutEmail > 0 && <> — {withoutEmail} selected contact{withoutEmail === 1 ? '' : 's'} skipped (no email on file)</>}.
        {!preview && <> Use <code>{'{{full_name}}'}</code>, <code>{'{{company}}'}</code> or <code>{'{{job_title}}'}</code> to personalize each email.</>}
      </div>

      {preview ? (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
            Showing how it looks for <strong>{previewCard.full_name || previewCard.email}</strong> (1 of {withEmail.length}) — <strong>each recipient gets their own version</strong>.
          </div>
          {leftover.length > 0 && (
            <div style={{ background: '#fff5f5', border: '1px solid #ffb3ab', color: '#b3241c', borderRadius: 'var(--radius)', padding: '10px 12px', marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
              ⚠️ Found placeholder{leftover.length === 1 ? '' : 's'} that won't be replaced: {leftover.map(p => <code key={p} style={{ marginRight: 6 }}>{p}</code>)} — check your template before sending.
            </div>
          )}
          <Field label="Subject">
            <div style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', fontSize: 13 }}>
              {renderedSubject}
            </div>
          </Field>
          <Field label="Message">
            <div style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', fontSize: 13, whiteSpace: 'pre-wrap', minHeight: 140, lineHeight: 1.5 }}>
              {renderedBody}
            </div>
          </Field>
        </>
      ) : (
        <>
          <Field label="Subject">
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </Field>
          <Field label="Message">
            <Textarea rows={10} value={body} onChange={e => setBody(e.target.value)} />
          </Field>
        </>
      )}

      <ModalActions>
        {preview ? (
          <>
            <Button variant="ghost" onClick={() => setPreview(false)}>← Edit</Button>
            <Button variant="primary" loading={sending} onClick={send}>
              Confirm & Send ({withEmail.length})
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={goToPreview}>Preview →</Button>
          </>
        )}
      </ModalActions>
    </Modal>
  );
}

/**
 * Historial de correos enviados desde Business Cards — lee `email_log`
 * directo (datos "congelados" al momento del envío, no join con
 * bussinescard, para que el historial no cambie si el contacto se edita
 * o se borra después).
 */
function EmailHistoryTable({ toast }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('email_log').select('*').order('sent_at', { ascending: false });
    if (error) toast('❌ ' + error.message, 'error');
    else setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(l =>
      !q
      || (l.recipient_name  || '').toLowerCase().includes(q)
      || (l.recipient_email || '').toLowerCase().includes(q)
      || (l.subject         || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const { sorted, toggle, icon } = useSort(filtered, 'sent_at', 'desc');
  const pagination = usePagination(sorted, 25);
  const failedCount = logs.filter(l => l.status === 'failed').length;

  return (
    <>
      <div className={styles.actions} style={{ marginBottom: 16 }}>
        <input className={styles.search} type="text" placeholder="🔍  Search contact, email, subject…" value={search} onChange={e => setSearch(e.target.value)} />
        {failedCount > 0 && <span className={styles.unmatchedBadge}>⚠️ {failedCount} failed</span>}
        <Button variant="ghost" onClick={load}>↻ Refresh</Button>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <SortableTh sortKey="recipient_name"  icon={icon} onToggle={toggle} className={tableStyles.stickyCol}>Contact</SortableTh>
              <SortableTh sortKey="recipient_email" icon={icon} onToggle={toggle}>Email</SortableTh>
              <SortableTh sortKey="subject"         icon={icon} onToggle={toggle}>Subject</SortableTh>
              <SortableTh sortKey="status"          icon={icon} onToggle={toggle}>Status</SortableTh>
              <SortableTh sortKey="sent_at"         icon={icon} onToggle={toggle}>Sent At</SortableTh>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={8} cols={5} />}
            {!loading && sorted.length === 0 && <tr className={tableStyles.stateRow}><td colSpan={5}>{search ? 'No results.' : 'No emails sent yet.'}</td></tr>}
            {!loading && pagination.paginated.map(l => (
              <tr key={l.id}>
                <td className={tableStyles.stickyCol}>{l.recipient_name || '—'}</td>
                <td>{l.recipient_email}</td>
                <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.subject}</td>
                <td>
                  {l.status === 'sent'
                    ? <span className={styles.matchedBadge}>✓ Sent</span>
                    : <span className={styles.unmatchedBadge} title={l.error_message || 'Unknown error'}>✕ Failed</span>
                  }
                </td>
                <td>{new Date(l.sent_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} />
    </>
  );
}

function BizCardModal({ open, initial, onClose, onSaved }) {
  const toast = useAppToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? Object.fromEntries(Object.keys(EMPTY).map(k => [k, initial[k]||''])) : EMPTY);
  }, [initial, open]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async () => {
    if (!form.full_name.trim()) { toast('⚠️ Name is required', 'warning'); return; }
    setSaving(true);
    const payload = Object.fromEntries(Object.entries(form).map(([k,v]) => [k, v.trim()||null]));
    const { error } = initial
      ? await supabase.from('bussinescard').update(payload).eq('ID', initial.ID)
      : await supabase.from('bussinescard').insert(payload);
    setSaving(false);
    if (error) { toast('❌ ' + error.message, 'error'); return; }
    toast(initial ? '✓ Card updated' : '✓ Card created');
    onSaved();
  };

  return (
    <Modal open={open} title={initial ? 'Edit Business Card' : 'New Business Card'} onClose={onClose} maxWidth={560}>
      <ModalGrid>
        <Field label="Full Name *" className="full"><Input value={form.full_name} onChange={set('full_name')} placeholder="John Smith" /></Field>
        <Field label="Company"><Input value={form.company} onChange={set('company')} placeholder="Acme Corp" /></Field>
        <Field label="Job Title"><Input value={form.job_title} onChange={set('job_title')} placeholder="CEO" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} placeholder="john@acme.com" /></Field>
        <Field label="Phone Office"><Input value={form.phone_office} onChange={set('phone_office')} placeholder="+1 555 000 0000" /></Field>
        <Field label="Phone Fax"><Input value={form.phone_fax} onChange={set('phone_fax')} placeholder="+1 555 000 0001" /></Field>
        <Field label="Website" className="full"><Input value={form.website} onChange={set('website')} placeholder="https://acme.com" /></Field>
        <Field label="City"><Input value={form.city} onChange={set('city')} placeholder="Las Vegas" /></Field>
        <Field label="State"><Input value={form.state} onChange={set('state')} placeholder="NV" /></Field>
        <Field label="Country"><Input value={form.country} onChange={set('country')} placeholder="USA" /></Field>
        <Field label="Address" className="full"><Input value={form.address} onChange={set('address')} placeholder="123 Main St" /></Field>
        <Field label="Notes" className="full"><Input value={form.notes} onChange={set('notes')} placeholder="Met at conference…" /></Field>
      </ModalGrid>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>{initial ? 'Save Changes' : 'Create Card'}</Button>
      </ModalActions>
    </Modal>
  );
}
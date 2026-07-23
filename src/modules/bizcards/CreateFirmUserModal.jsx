import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Select, ModalGrid, ModalActions } from '@/components/ui/index';

// Genera una contraseña sugerida a partir del nombre de la firma
function suggestPassword(firmName) {
  const slug = (firmName || 'itasklegal')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  return `${slug || 'itasklegal'}.portal`;
}

/**
 * Crea, en un solo paso:
 *  1. La firma (si no eliges una existente) o reusa una ya creada
 *  2. El usuario de portal (rol 'firm') vía webhook de n8n
 *  3. Vincula la business card con la firma resultante
 */
export function CreateFirmUserModal({ open, card, firms, onClose, onDone, toast }) {
  const [existingFirmId, setExistingFirmId] = useState('');
  const [form, setForm] = useState({
    firm_name: '', contact_name: '', firm_phone: '', email: '', address: '', password: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !card) return;

    // Buscar coincidencia exacta por nombre (case-insensitive, sin espacios extra)
    const cardCompany = (card.company || '').trim().toLowerCase();
    const match = cardCompany
      ? (firms || []).find(f => (f.firm_name || '').trim().toLowerCase() === cardCompany)
      : null;

    setExistingFirmId(match ? String(match.ID_number) : '');
    setForm({
      firm_name: card.company || '',
      contact_name: card.full_name || '',
      firm_phone: card.phone_office || '',
      email: card.email || '',
      address: card.address || '',
      password: suggestPassword(card.company),
    });
  }, [open, card, firms]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async () => {
    if (!existingFirmId && !form.firm_name.trim()) {
      toast('⚠️ Firm Name is required', 'warning'); return;
    }
    if (!form.email.trim())     { toast('⚠️ Email is required for the portal login', 'warning'); return; }
    if (!form.password || form.password.length < 6) {
      toast('⚠️ Password must be at least 6 characters', 'warning'); return;
    }

    const webhookUrl = import.meta.env.VITE_N8N_CREATE_USER_WEBHOOK;
    if (!webhookUrl) {
      toast('❌ Webhook not configured (VITE_N8N_CREATE_USER_WEBHOOK)', 'error');
      return;
    }

    setSaving(true);
    let firmId = existingFirmId || null;

    // 1. Si no eligieron una firma existente, crear una nueva
    if (!firmId) {
      const { data: newFirm, error: firmError } = await supabase
        .from('law_firm')
        .insert({
          firm_name: form.firm_name.trim(),
          contact_name: form.contact_name.trim() || null,
          firm_phone: form.firm_phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          notes: `Created from Business Card #${card.ID}`,
        })
        .select()
        .single();

      if (firmError) {
        setSaving(false);
        toast('❌ ' + firmError.message, 'error');
        return;
      }
      firmId = newFirm.ID_number;
    }

    // 2. Crear el usuario de portal vía n8n (no toca la sesión del admin)
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-token': import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          full_name: form.contact_name.trim() || form.firm_name.trim(),
          role: 'firm',
          firm_id: firmId,
        }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok || result.error) {
        toast('⚠️ Firm ready, but user creation failed: ' + (result.error || res.status), 'warning');
      } else {
        toast('✓ Portal access created');
      }
    } catch (err) {
      toast('⚠️ Firm ready, but could not reach n8n: ' + err.message, 'warning');
    }

    // 3. Vincular la card con la firma resultante
    await supabase.from('bussinescard').update({ firm_id: firmId }).eq('ID', card.ID);

    setSaving(false);
    onDone();
  };

  return (
    <Modal open={open} title="Create Portal Access" onClose={onClose} maxWidth={480}>
      <div style={{
        background: 'var(--gold-muted)', border: '1px solid var(--gold)',
        borderRadius: 'var(--radius)', padding: '10px 12px',
        fontSize: 12, color: 'var(--gold-dark)', marginBottom: 16, lineHeight: 1.5,
      }}>
        Select an existing firm, or leave empty to create a new one from this card's data.
      </div>

      <ModalGrid>
        <Field label="Existing Firm (optional)" className="full">
          <Select value={existingFirmId} onChange={e => setExistingFirmId(e.target.value)}>
            <option value="">— Create new firm —</option>
            {(firms || []).map(f => (
              <option key={f.ID_number} value={f.ID_number}>{f.firm_name}</option>
            ))}
          </Select>
          {existingFirmId && (
            <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
              ✓ Matched automatically by firm name
            </div>
          )}
        </Field>

        {!existingFirmId && (
          <>
            <Field label="Firm Name *"><Input value={form.firm_name} onChange={set('firm_name')} placeholder="Acme Corp" /></Field>
            <Field label="Contact Name"><Input value={form.contact_name} onChange={set('contact_name')} placeholder="John Smith" /></Field>
            <Field label="Phone"><Input value={form.firm_phone} onChange={set('firm_phone')} placeholder="+1 555 000 0000" /></Field>
            <Field label="Address"><Input value={form.address} onChange={set('address')} placeholder="123 Main St" /></Field>
          </>
        )}

        <Field label="Login Email *" className="full"><Input type="email" value={form.email} onChange={set('email')} placeholder="john@acme.com" /></Field>
        <Field label="Login Password *" className="full">
          <Input type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
        </Field>
      </ModalGrid>

      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -8, marginBottom: 4 }}>
        Share this password with the client — they can change it anytime from their Profile page.
      </div>

      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>Create Access</Button>
      </ModalActions>
    </Modal>
  );
}

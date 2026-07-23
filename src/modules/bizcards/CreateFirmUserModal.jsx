import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, ModalActions } from '@/components/ui/index';

function suggestPassword(firmName) {
  const slug = (firmName || 'itasklegal')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30);
  return `${slug || 'itasklegal'}.itasklegal`;
}

/**
 * Crea, en un solo paso y SIN pedir datos que ya están en la card:
 *  1. La firma — solo si NO hay match exacto por nombre de compañía
 *     (usa company/full_name/phone_office/address directo de la card)
 *  2. El usuario de portal (rol 'firm') vía webhook de n8n
 *  3. Vincula la business card con la firma resultante
 */
export function CreateFirmUserModal({ open, card, firms, onClose, onDone, toast }) {
  const [matchedFirm, setMatchedFirm] = useState(null); // firma existente detectada, o null
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !card) return;

    const cardCompany = (card.company || '').trim().toLowerCase();
    const match = cardCompany
      ? (firms || []).find(f => (f.firm_name || '').trim().toLowerCase() === cardCompany)
      : null;

    setMatchedFirm(match || null);
    setEmail(card.email || '');
    setPassword(suggestPassword(match ? match.firm_name : card.company));
  }, [open, card, firms]);

  const submit = async () => {
    if (!email.trim())     { toast('⚠️ Login email is required', 'warning'); return; }
    if (!password || password.length < 6) {
      toast('⚠️ Password must be at least 6 characters', 'warning'); return;
    }
    if (!matchedFirm && !card.company) {
      toast('⚠️ This card has no company name — add one before creating access', 'warning');
      return;
    }

    const webhookUrl = import.meta.env.VITE_N8N_CREATE_USER_WEBHOOK;
    if (!webhookUrl) {
      toast('❌ Webhook not configured (VITE_N8N_CREATE_USER_WEBHOOK)', 'error');
      return;
    }

    setSaving(true);
    let firmId = matchedFirm?.ID_number;

    // Sin match → crear la firma directo con los datos que ya trae la card
    if (!firmId) {
      const { data: newFirm, error: firmError } = await supabase
        .from('law_firm')
        .insert({
          firm_name: card.company,
          contact_name: card.full_name || null,
          firm_phone: card.phone_office || null,
          email: card.email || null,
          address: card.address || null,
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

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-token': import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: card.full_name || card.company,
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

    await supabase.from('bussinescard').update({ firm_id: firmId }).eq('ID', card.ID);

    setSaving(false);
    onDone();
  };

  return (
    <Modal open={open} title="Portal Access" onClose={onClose} maxWidth={420}>
      <Field label="Login Email *">
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@acme.com" />
      </Field>
      <div style={{ height: 14 }} />
      <Field label="Login Password *">
        <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
      </Field>

      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
        Share this password with the client.
      </div>

      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>Create Access</Button>
      </ModalActions>
    </Modal>
  );
}
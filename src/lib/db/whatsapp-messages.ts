import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function saveInboundMessage(p: { userId: string; phoneNormalized: string; content: string; externalMessageId?: string; rawPayload?: unknown; intent?: string }): Promise<void> {
  const { error } = await getSupabaseAdmin().from('whatsapp_messages').insert({ user_id: p.userId, phone_normalized: p.phoneNormalized, direction: 'inbound', content: p.content, message_type: 'text', external_message_id: p.externalMessageId ?? null, raw_payload: p.rawPayload ?? null, status: 'received', intent: p.intent ?? null });
  if (error) console.error('[db/messages] inbound:', error.message);
}

export async function saveOutboundMessage(p: { userId: string; phoneNormalized: string; content: string; intent?: string; simulated?: boolean }): Promise<void> {
  const { error } = await getSupabaseAdmin().from('whatsapp_messages').insert({ user_id: p.userId, phone_normalized: p.phoneNormalized, direction: 'outbound', content: p.content, message_type: 'text', status: p.simulated ? 'simulated' : 'sent', intent: p.intent ?? null });
  if (error) console.error('[db/messages] outbound:', error.message);
}

export async function messageAlreadyProcessed(externalMessageId: string): Promise<boolean> {
  if (!externalMessageId) return false;
  const { data } = await getSupabaseAdmin().from('whatsapp_messages').select('id').eq('external_message_id', externalMessageId).eq('direction', 'inbound').maybeSingle();
  return !!data;
}

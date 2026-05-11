export type ParsedWhatsAppMessage = {
  from: string;
  text: string;
  messageId?: string;
  timestamp?: string;
  raw: unknown;
};

function parseZApiPayload(payload: unknown): ParsedWhatsAppMessage[] {
  try {
    const p = payload as Record<string, unknown>;
    const phone = p?.phone as string;
    const text = (p?.text as Record<string, unknown>)?.message as string;
    if (!phone || !text) return [];
    if (p?.fromMe === true) return [];
    return [{ from: phone.replace(/\D/g, ''), text, messageId: p?.messageId as string | undefined, timestamp: p?.momment ? String(p.momment) : undefined, raw: payload }];
  } catch { return []; }
}

function parseMetaPayload(payload: unknown): ParsedWhatsAppMessage[] {
  const results: ParsedWhatsAppMessage[] = [];
  try {
    const entries = (payload as Record<string, unknown>)?.entry as unknown[];
    if (!Array.isArray(entries)) return results;
    for (const entry of entries) {
      const changes = (entry as Record<string, unknown>)?.changes as unknown[];
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        const messages = ((change as Record<string, unknown>)?.value as Record<string, unknown>)?.messages as unknown[];
        if (!Array.isArray(messages)) continue;
        for (const msg of messages) {
          const m = msg as Record<string, unknown>;
          const body = (m?.text as Record<string, unknown>)?.body as string | undefined;
          if (!body) continue;
          results.push({ from: (m?.from as string) ?? '', text: body, messageId: m?.id as string | undefined, timestamp: m?.timestamp as string | undefined, raw: msg });
        }
      }
    }
  } catch (err) { console.error('[parseWebhook/Meta]', err); }
  return results;
}

export function parseWhatsAppWebhookPayload(payload: unknown): ParsedWhatsAppMessage[] {
  try {
    const p = payload as Record<string, unknown>;
    if (p?.phone && typeof p.phone === 'string') return parseZApiPayload(payload);
    if (Array.isArray(p?.entry)) return parseMetaPayload(payload);
  } catch (err) { console.error('[parseWebhook]', err); }
  return [];
}

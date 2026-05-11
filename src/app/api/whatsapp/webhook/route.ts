import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { parseWhatsAppWebhookPayload } from '@/lib/whatsapp/parse-webhook';
import { handleIncomingWhatsAppMessage } from '@/lib/bot/handle-incoming-message';

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === env.whatsappVerifyToken) {
    return new NextResponse(p.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  const messages = parseWhatsAppWebhookPayload(body);
  let processed = 0;
  for (const msg of messages) {
    try { await handleIncomingWhatsAppMessage({ phone: msg.from, text: msg.text, messageId: msg.messageId, rawPayload: msg.raw }); processed++; }
    catch (err) { console.error('[webhook]', err instanceof Error ? err.message : err); }
  }
  return NextResponse.json({ ok: true, processed });
}

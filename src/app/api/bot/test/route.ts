import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { handleIncomingWhatsAppMessage } from '@/lib/bot/handle-incoming-message';

export async function POST(req: NextRequest) {
  if (!env.isDev) return NextResponse.json({ ok: false, error: 'Apenas em development' }, { status: 403 });
  let body: { phone?: string; text?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }
  const { phone, text } = body;
  if (!phone || !text) return NextResponse.json({ ok: false, error: 'phone e text são obrigatórios' }, { status: 400 });
  const result = await handleIncomingWhatsAppMessage({ phone, text, messageId: `test-${Date.now()}`, rawPayload: { source: 'test' } });
  return NextResponse.json({ ok: result.ok, intent: result.intent, responseText: result.responseText, simulated: result.simulated ?? true, error: result.error });
}

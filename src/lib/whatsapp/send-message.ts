import { env } from '@/lib/env';

type SendMessageParams = { to: string; body: string };
type SendMessageResult = { ok: boolean; simulated?: boolean; response?: unknown; error?: string };

async function sendViaZApi({ to, body }: SendMessageParams): Promise<SendMessageResult> {
  const phone = to.replace(/\D/g, '');
  const url = `https://api.z-api.io/instances/${env.zapiInstanceId}/token/${env.zapiToken}/send-text`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'client-token': env.zapiClientToken },
      body: JSON.stringify({ phone, message: body }),
    });
    const data = await res.json();
    if (!res.ok) { console.error('[Z-API] Erro:', res.status, JSON.stringify(data)); return { ok: false, error: `Z-API status ${res.status}` }; }
    return { ok: true, response: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

async function sendViaMeta({ to, body }: SendMessageParams): Promise<SendMessageResult> {
  const url = `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
    });
    const data = await res.json();
    if (!res.ok) { console.error('[Meta] Erro:', res.status); return { ok: false, error: `Meta status ${res.status}` }; }
    return { ok: true, response: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function sendWhatsAppMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const hasZApi = !!(env.zapiInstanceId && env.zapiToken);
  const hasMeta = !!(env.whatsappToken && env.whatsappPhoneNumberId);

  if (!hasZApi && !hasMeta) {
    if (env.isDev) {
      console.log(`[WhatsApp SIMULADO] Para: ${params.to}\n${params.body.substring(0, 80)}`);
      return { ok: true, simulated: true };
    }
    return { ok: false, error: 'Nenhum provider configurado' };
  }

  if (hasZApi) {
    console.log(`[Z-API] Enviando para ${params.to}`);
    return sendViaZApi(params);
  }

  console.log(`[Meta] Enviando para ${params.to}`);
  return sendViaMeta(params);
}

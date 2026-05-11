# update-zapi.ps1 — Atualiza os arquivos para suporte Z-API
# Execute dentro da pasta redoma-v2:
# powershell -ExecutionPolicy Bypass -File update-zapi.ps1

Write-Host "Atualizando arquivos para Z-API..." -ForegroundColor Cyan

# ── src/lib/env.ts ──────────────────────────────────────────────────────────
$envTs = @'
const isDev = process.env.BOT_ENV === 'development' || process.env.NODE_ENV === 'development';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`[env] Variável obrigatória não encontrada: ${key}`);
  return value;
}
function optionalEnv(key: string, fallback = ''): string { return process.env[key] ?? fallback; }
function warnIfMissing(key: string): string {
  const value = process.env[key] ?? '';
  if (!value && !isDev) console.warn(`[env] ${key} não configurada.`);
  return value;
}

export const env = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: optionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  appUrl: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  zapiInstanceId: warnIfMissing('ZAPI_INSTANCE_ID'),
  zapiToken: warnIfMissing('ZAPI_TOKEN'),
  zapiClientToken: optionalEnv('ZAPI_CLIENT_TOKEN'),
  whatsappToken: optionalEnv('WHATSAPP_TOKEN'),
  whatsappPhoneNumberId: optionalEnv('WHATSAPP_PHONE_NUMBER_ID'),
  whatsappVerifyToken: optionalEnv('WHATSAPP_VERIFY_TOKEN', 'redoma_dev_token'),
  whatsappApiVersion: optionalEnv('WHATSAPP_API_VERSION', 'v21.0'),
  botEnv: optionalEnv('BOT_ENV', 'development'),
  isDev,
};
'@
Set-Content -Path "src\lib\env.ts" -Value $envTs -Encoding UTF8
Write-Host "  [OK] src/lib/env.ts" -ForegroundColor Green

# ── src/lib/whatsapp/send-message.ts ────────────────────────────────────────
$sendTs = @'
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
'@
Set-Content -Path "src\lib\whatsapp\send-message.ts" -Value $sendTs -Encoding UTF8
Write-Host "  [OK] src/lib/whatsapp/send-message.ts" -ForegroundColor Green

# ── src/lib/whatsapp/parse-webhook.ts ───────────────────────────────────────
$parseTs = @'
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
'@
Set-Content -Path "src\lib\whatsapp\parse-webhook.ts" -Value $parseTs -Encoding UTF8
Write-Host "  [OK] src/lib/whatsapp/parse-webhook.ts" -ForegroundColor Green

Write-Host ""
Write-Host "Pronto! Agora reinicie o servidor: npm run dev" -ForegroundColor Cyan

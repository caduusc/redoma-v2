import { normalizePhone } from '@/lib/utils/normalize-phone';
import { detectIntent } from '@/lib/bot/detect-intent';
import { getOrCreateUserByPhone } from '@/lib/db/users';
import { getOrCreateBotSession } from '@/lib/db/bot-sessions';
import { saveInboundMessage, saveOutboundMessage, messageAlreadyProcessed } from '@/lib/db/whatsapp-messages';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { runStateMachine } from '@/lib/bot/state-machine';

type Params = { phone: string; text: string; messageId?: string; rawPayload?: unknown };
type Result = { ok: boolean; intent?: string; responseText?: string; simulated?: boolean; error?: string };

// Números dos admins que recebem notificações
const ADMIN_PHONES = ['5511978060056', '5511944774344'];

async function notifyAdmins(message: string): Promise<void> {
  await Promise.allSettled(
    ADMIN_PHONES.map(admin => sendWhatsAppMessage({ to: admin, body: message }))
  );
}

export async function handleIncomingWhatsAppMessage({ phone, text, messageId, rawPayload }: Params): Promise<Result> {
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) return { ok: false, error: 'Telefone inválido' };
  console.log(`[bot] Mensagem de ${phoneNormalized}`);
  if (messageId && await messageAlreadyProcessed(messageId)) { console.log(`[bot] Duplicata ${messageId}`); return { ok: true }; }
  const user    = await getOrCreateUserByPhone(phoneNormalized);
  const session = await getOrCreateBotSession(user.id);
  console.log(`[bot] Estado: ${session.current_state}`);
  const intent = detectIntent(text);
  console.log(`[bot] Intenção: ${intent}`);
  await saveInboundMessage({ userId: user.id, phoneNormalized, content: text, externalMessageId: messageId, rawPayload, intent });

  // Notifica admins sobre toda mensagem recebida
  notifyAdmins(`📩 *Nova mensagem*\n*De:* +${phoneNormalized}\n*Texto:* ${text.slice(0, 100)}`).catch(console.error);

  // Mensagem imediata enquanto o Playwright gera o link de afiliado
  if (intent === 'URL_PRODUTO') {
    await sendWhatsAppMessage({
      to: phoneNormalized,
      body: '⏳ Seu link está sendo gerado, em instantes você irá receber!',
    });
  }

  let responseText: string;
  try { responseText = await runStateMachine({ user, session, intent, messageText: text }); }
  catch (err) { console.error('[bot] Erro:', err); responseText = 'Ocorreu um erro interno. Tente novamente.'; }

  // Notifica admins quando cair no fallback (precisa de atendimento humano)
  if (intent === 'FALLBACK') {
    notifyAdmins(`🚨 *Atendimento necessário*\n*Cliente:* +${phoneNormalized}\n*Mensagem:* ${text.slice(0, 100)}\n\nResponda diretamente para o número acima.`).catch(console.error);
  }

  const sendResult = await sendWhatsAppMessage({ to: phoneNormalized, body: responseText });
  await saveOutboundMessage({ userId: user.id, phoneNormalized, content: responseText, intent, simulated: sendResult.simulated });
  return { ok: true, intent, responseText, simulated: sendResult.simulated };
}
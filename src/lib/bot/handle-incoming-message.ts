import { normalizePhone } from '@/lib/utils/normalize-phone';
import { detectIntent } from '@/lib/bot/detect-intent';
import { getOrCreateUserByPhone, updateUserFullName } from '@/lib/db/users';
import { getOrCreateBotSession, updateBotSession, resetBotSession } from '@/lib/db/bot-sessions';
import { saveInboundMessage, saveOutboundMessage, messageAlreadyProcessed } from '@/lib/db/whatsapp-messages';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { runStateMachine } from '@/lib/bot/state-machine';

type Params  = { phone: string; text: string; messageId?: string; rawPayload?: unknown };
type Result  = { ok: boolean; intent?: string; responseText?: string; simulated?: boolean; error?: string };

const ADMIN_PHONES = ['5511978060056'];

async function notifyAdmins(message: string): Promise<void> {
  await Promise.allSettled(
    ADMIN_PHONES.map(admin => sendWhatsAppMessage({ to: admin, body: message }))
  );
}

export async function handleIncomingWhatsAppMessage({
  phone,
  text,
  messageId,
  rawPayload,
}: Params): Promise<Result> {
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) return { ok: false, error: 'Telefone inválido' };

  console.log(`[bot] Mensagem de ${phoneNormalized}`);

  if (messageId && (await messageAlreadyProcessed(messageId))) {
    console.log(`[bot] Duplicata ${messageId}`);
    return { ok: true };
  }

  const user    = await getOrCreateUserByPhone(phoneNormalized);
  const session = await getOrCreateBotSession(user.id);

  console.log(`[bot] Estado: ${session.current_state}`);

  // ── COLETA DE NOME (primeira vez) ────────────────────────────────────────────
  if (!user.full_name) {
    if (session.current_state === 'awaiting_name') {
      // Usuário está respondendo com o nome
      const name = text.trim();

      if (name.length < 2 || /^https?:\/\//i.test(name)) {
        await sendWhatsAppMessage({
          to: phoneNormalized,
          body: 'Por favor, me informe apenas o seu nome 😊',
        });
        return { ok: true };
      }

      await updateUserFullName(user.id, name);
      await resetBotSession(user.id);

      await sendWhatsAppMessage({
        to: phoneNormalized,
        body: `Prazer, ${name}! 🎉\n\nAgora é só me enviar o link de qualquer produto do Mercado Livre, Amazon, Shopee, SHEIN e etc — eu gero seu novo link na hora! 🛍️`,
      });

      return { ok: true };
    }

    // Ainda não temos o nome — pede agora
    await updateBotSession(user.id, 'awaiting_name');

    await sendWhatsAppMessage({
      to: phoneNormalized,
      body: 'Olá! Vejo que é sua primeira vez aqui 😊\n\nMe informe o nome que deseja ser chamado:',
    });

    return { ok: true };
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const intent = detectIntent(text);
  console.log(`[bot] Intenção: ${intent}`);

  await saveInboundMessage({
    userId: user.id,
    phoneNormalized,
    content: text,
    externalMessageId: messageId,
    rawPayload,
    intent,
  });

  // Notifica admins sobre toda mensagem recebida (após coleta de nome)
  notifyAdmins(
    `📩 *Nova mensagem*\n*De:* +${phoneNormalized}\n*Nome:* ${user.full_name}\n*Texto:* ${text.slice(0, 100)}`
  ).catch(console.error);

  // Resposta imediata enquanto o Playwright gera o link de afiliado
  if (intent === 'URL_PRODUTO') {
    await sendWhatsAppMessage({
      to: phoneNormalized,
      body: '⏳ Seu link está sendo gerado, em instantes você irá receber!',
    });
  }

  let responseText: string;
  try {
    responseText = await runStateMachine({ user, session, intent, messageText: text });
  } catch (err) {
    console.error('[bot] Erro:', err);
    responseText = 'Ocorreu um erro interno. Tente novamente.';
  }

  // Notifica admins quando cair no fallback (precisa de atendimento humano)
  if (intent === 'FALLBACK') {
    notifyAdmins(
      `🚨 *Atendimento necessário*\n*Cliente:* +${phoneNormalized}\n*Nome:* ${user.full_name}\n*Mensagem:* ${text.slice(0, 100)}\n\nResponda diretamente para o número acima.`
    ).catch(console.error);
  }

  const sendResult = await sendWhatsAppMessage({ to: phoneNormalized, body: responseText });

  await saveOutboundMessage({
    userId: user.id,
    phoneNormalized,
    content: responseText,
    intent,
    simulated: sendResult.simulated,
  });

  return { ok: true, intent, responseText, simulated: sendResult.simulated };
}
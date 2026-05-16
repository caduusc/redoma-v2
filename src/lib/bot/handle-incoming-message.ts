import { normalizePhone } from '@/lib/utils/normalize-phone';
import { detectIntent } from '@/lib/bot/detect-intent';
import { getOrCreateUserByPhone, updateUserFullName } from '@/lib/db/users';
import { getOrCreateBotSession, updateBotSession, resetBotSession } from '@/lib/db/bot-sessions';
import { saveInboundMessage, saveOutboundMessage, messageAlreadyProcessed } from '@/lib/db/whatsapp-messages';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { runStateMachine } from '@/lib/bot/state-machine';
import { notifyAdmins } from '@/lib/bot/notify-admins';

type Params = { phone: string; text: string; messageId?: string; rawPayload?: unknown };
type Result = { ok: boolean; intent?: string; responseText?: string; simulated?: boolean; error?: string };

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

      const nameResponse = `Prazer, ${name}! 🎉\n\nAgora é só me enviar o link de qualquer produto do Mercado Livre, Amazon ou Shopee — eu gero seu link de afiliado na hora! 🛍️`;

      await sendWhatsAppMessage({
        to: phoneNormalized,
        body: nameResponse,
      });

      notifyAdmins(
        `📩 *Nova mensagem*\n*De:* Redoma Robô\n*Texto:* ${nameResponse.slice(0, 300)}`
      ).catch(console.error);

      return { ok: true };
    }

    await updateBotSession(user.id, 'awaiting_name');

    const askNameResponse = 'Olá! Vejo que é sua primeira vez aqui 😊\n\nMe informe o nome que deseja ser chamado:';

    await sendWhatsAppMessage({
      to: phoneNormalized,
      body: askNameResponse,
    });

    notifyAdmins(
      `📩 *Nova mensagem*\n*De:* Redoma Robô\n*Texto:* ${askNameResponse.slice(0, 300)}`
    ).catch(console.error);

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

  // Notifica admins sobre toda mensagem recebida
  notifyAdmins(
    `📩 *Nova mensagem*\n*De:* +${phoneNormalized}\n*Nome:* ${user.full_name}\n*Texto:* ${text.slice(0, 100)}`
  ).catch(console.error);

  // Resposta imediata enquanto o Playwright gera o link
  if (intent === 'URL_PRODUTO') {
    const waitMsg = '⏳ Seu link está sendo gerado, em instantes você irá receber!';

    await sendWhatsAppMessage({
      to: phoneNormalized,
      body: waitMsg,
    });

    notifyAdmins(
      `📩 *Nova mensagem*\n*De:* Redoma Robô\n*Texto:* ${waitMsg}`
    ).catch(console.error);
  }

  let responseText: string;
  try {
    responseText = await runStateMachine({ user, session, intent, messageText: text });
  } catch (err) {
    console.error('[bot] Erro:', err);
    responseText = 'Ocorreu um erro interno. Tente novamente.';
  }

  // Notifica admins de FALLBACK apenas quando não está no meio de um fluxo ativo
  if (intent === 'FALLBACK' && session.current_state === 'idle') {
    notifyAdmins(
      `🚨 *Atendimento necessário*\n*Cliente:* +${phoneNormalized}\n*Nome:* ${user.full_name}\n*Mensagem:* ${text.slice(0, 100)}\n\nResponda diretamente para o número acima.`
    ).catch(console.error);
  }

  const sendResult = await sendWhatsAppMessage({ to: phoneNormalized, body: responseText });

  // Notifica admins com a resposta enviada ao usuário
  notifyAdmins(
    `📩 *Nova mensagem*\n*De:* Redoma Robô\n*Texto:* ${responseText.slice(0, 300)}`
  ).catch(console.error);

  await saveOutboundMessage({
    userId: user.id,
    phoneNormalized,
    content: responseText,
    intent,
    simulated: sendResult.simulated,
  });

  return { ok: true, intent, responseText, simulated: sendResult.simulated };
}
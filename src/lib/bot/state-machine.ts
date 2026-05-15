import { User } from '@/lib/db/users';
import { BotSession, resetBotSession } from '@/lib/db/bot-sessions';
import { BotIntent } from '@/lib/bot/detect-intent';
import { handleMenu } from '@/lib/bot/handlers/menu';
import { handleHelp } from '@/lib/bot/handlers/help';
import { handleFallback } from '@/lib/bot/handlers/fallback';
import { handleStopMarketing } from '@/lib/bot/handlers/stop-marketing';
import { handlePoints } from '@/lib/bot/handlers/points';
import { handleChangeInstitution } from '@/lib/bot/handlers/change-institution';
import { handleSaudacao } from '@/lib/bot/handlers/saudacao';
import { identifyMarketplace, generateAffiliateLink } from '@/lib/bot/marketplace';
import { findPartnerStoreByDomain, createGeneratedLink } from '@/lib/db/generated-links';
import { getCurrentInstitutionForUser } from '@/lib/db/institutions';
import { notifyAdmins } from '@/lib/bot/notify-admins';
import { env } from '@/lib/env';

type P = { user: User; session: BotSession; intent: BotIntent; messageText: string };

export async function runStateMachine({ user, session, intent, messageText }: P): Promise<string> {
  if (intent === 'MENU') {
    if (session.current_state !== 'idle') await resetBotSession(user.id);
    return handleMenu({ user });
  }

  if (session.current_state !== 'idle') {
    return handleChangeInstitution({ user, session, messageText });
  }

  switch (intent) {
    case 'SAUDACAO':
      return handleSaudacao({ user });

    case 'AJUDA':
      return handleHelp({ user });

    case 'VER_PONTOS':
      return handlePoints({ user });

    case 'PARAR_MARKETING':
      return handleStopMarketing({ user });

    case 'TROCAR_INSTITUICAO':
      return handleChangeInstitution({ user, session, messageText });

    case 'URL_PRODUTO': {
      // 1. Identifica marketplace e extrai URL do produto
      const detected = identifyMarketplace(messageText);

      if (!detected) {
        const urlMatch = messageText.match(/https?:\/\/[^\s]+/i);
        const rawUrl = urlMatch ? urlMatch[0] : messageText.slice(0, 100);

        notifyAdmins(
          `🛍️ *Loja não suportada*\n*Cliente:* +${user.phone_normalized}\n*Nome:* ${user.full_name}\n*Link enviado:* ${rawUrl}\n\nAtenda manualmente para não perder a venda.`
        ).catch(console.error);

        return [
          '⚠️ Não reconheci essa loja ainda.\n\n',
          'Um atendente irá te ajudar em instantes! 😊',
        ].join('');
      }

      const { marketplace, productUrl } = detected;

      // 2. Busca instituição atual do usuário e loja parceira em paralelo
      const [institution, store] = await Promise.all([
        getCurrentInstitutionForUser(user.id),
        findPartnerStoreByDomain(productUrl),
      ]);

      // 3. Chama o serviço Python para gerar o link de afiliado real
      const affiliateResult = await generateAffiliateLink({
        marketplace,
        productUrl,
        tag: null,
      });

      // 4. Se o serviço falhou, avisa o usuário e notifica admins
      if (!affiliateResult.success) {
        console.error(`[URL_PRODUTO] Falha ao gerar link: ${affiliateResult.error}`);

        notifyAdmins(
          `⚠️ *Erro ao gerar link*\n*Cliente:* +${user.phone_normalized}\n*Nome:* ${user.full_name}\n*Loja:* ${marketplace}\n*Link original:* ${productUrl}\n*Erro:* ${affiliateResult.error}`
        ).catch(console.error);

        return [
          '😕 Não consegui gerar seu link agora.\n\n',
          'Um atendente vai te ajudar em instantes!\n\n',
          '_' + affiliateResult.error + '_',
        ].join('');
      }

      // 5. Salva o registro no banco (sem tracking_code/short_url)
      await createGeneratedLink({
        userId: user.id,
        institutionId: institution?.id ?? null,
        partnerStoreId: store?.id ?? null,
        originalUrl: productUrl,
        affiliateUrl: affiliateResult.affiliateLink,
      });

      // 6. Notifica admins sobre link gerado com sucesso
      notifyAdmins(
        `✅ *Link gerado*\n*Cliente:* +${user.phone_normalized}\n*Nome:* ${user.full_name}\n*Loja:* ${marketplace}\n*Produto:* ${productUrl.slice(0, 80)}\n*Link gerado:* ${affiliateResult.affiliateLink}`
      ).catch(console.error);

      // 7. Monta mensagem com link de afiliado direto
      const institutionLine = institution
        ? `Comprando por esse link, *${institution.name}* receberá até 5% do valor da compra! 💚\n\n`
        : '✅ Compre por esse link e sua instituição recebe impacto!\n\n';

      return [
        `🔗 *Seu link está pronto!*\n\n`,
        `${affiliateResult.affiliateLink}\n\n`,
        institutionLine,
        '_O link tem duração de 24 horas._\n\n',
        'Agradecemos por usar a *Redoma*, volte sempre! 🙌',
      ].join('');
    }

    default:
      return handleFallback({ user });
  }
}
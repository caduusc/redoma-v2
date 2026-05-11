import { User } from '@/lib/db/users';
import { BotSession, resetBotSession } from '@/lib/db/bot-sessions';
import { BotIntent } from '@/lib/bot/detect-intent';
import { handleMenu } from '@/lib/bot/handlers/menu';
import { handleHelp } from '@/lib/bot/handlers/help';
import { handleFallback } from '@/lib/bot/handlers/fallback';
import { handleStopMarketing } from '@/lib/bot/handlers/stop-marketing';
import { handlePoints } from '@/lib/bot/handlers/points';
import { handleChangeInstitution } from '@/lib/bot/handlers/change-institution';
import {
  identifyMarketplace,
  generateAffiliateLink,
} from '@/lib/bot/marketplace';
import {
  findPartnerStoreByDomain,
  createGeneratedLink,
} from '@/lib/db/generated-links';
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
        return [
          '⚠️ Não reconheci essa loja ainda.\n\n',
          'Trabalhamos com *Mercado Livre*, *Amazon*, *Shopee* e *Magalu*.\n\n',
          'Manda o link de um produto de uma dessas lojas e eu gero seu link! 🛍️',
        ].join('');
      }

      const { marketplace, productUrl } = detected;

      // 2. Busca a loja parceira no banco (para associar ao link gerado)
      const store = await findPartnerStoreByDomain(productUrl);

      // 3. Chama o serviço Python para gerar o link de afiliado real
      //    Tag é null — sem tag por comunidade nessa versão
      const affiliateResult = await generateAffiliateLink({
        marketplace,
        productUrl,
        tag: null,
      });

      // 4. Se o serviço falhou, avisa o usuário
      if (!affiliateResult.success) {
        console.error(
          `[URL_PRODUTO] Falha ao gerar link de afiliado: ${affiliateResult.error}`
        );
        return [
          '😕 Não consegui gerar seu link agora.\n\n',
          'Um atendente vai te ajudar em instantes!\n\n',
          '_' + affiliateResult.error + '_',
        ].join('');
      }

      // 5. Salva o link rastreável no banco
      const generated = await createGeneratedLink({
        userId: user.id,
        institutionId: null,
        partnerStoreId: store?.id ?? null,
        originalUrl: productUrl,
        affiliateUrl: affiliateResult.affiliateLink,
        appUrl: env.appUrl,
      });

      // 6. Responde com o link curto
      const storeName = store ? ` _(${store.name})_` : '';

      return [
        `🔗 Seu link está pronto!${storeName}\n\n`,
        `${generated.short_url}\n\n`,
        '✅ Compre por esse link e a instituição escolhida receberá até 5% de apoio!\n',
        '_O link tem duração de 24 horas._\n\n',
        'Digite *MENU* para ver outras opções.',
      ].join('');
    }

    default:
      return handleFallback({ user });
  }
}
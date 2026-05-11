import { User } from '@/lib/db/users';
import { BotSession, updateBotSession, resetBotSession } from '@/lib/db/bot-sessions';
import { searchInstitutionByNameOrSlug, setCurrentInstitutionForUser } from '@/lib/db/institutions';

type P = { user: User; session: BotSession; messageText: string };

export async function handleChangeInstitution({ user, session, messageText }: P): Promise<string> {
  if (session.current_state === 'idle') {
    await updateBotSession(user.id, 'awaiting_institution_name', {});
    return `Qual instituição você deseja apoiar agora? 🌱\n\nDigite o nome da instituição.`;
  }
  if (session.current_state === 'awaiting_institution_name') {
    const inst = await searchInstitutionByNameOrSlug(messageText);
    if (!inst) return `Não encontrei essa instituição. 😕\n\nTente digitar de outra forma ou responda *MENU* para voltar.`;
    await updateBotSession(user.id, 'awaiting_institution_confirmation', { institution_id: inst.id, institution_name: inst.name });
    return `Encontrei: *${inst.name}* ✅\n\nDeseja passar a apoiar essa instituição?\n\nResponda *SIM* ou *NÃO*.`;
  }
  if (session.current_state === 'awaiting_institution_confirmation') {
    const n = messageText.toLowerCase().trim();
    const instName = session.context?.institution_name as string;
    const instId   = session.context?.institution_id   as string;
    if (['sim','s','1'].includes(n) && instId) {
      await setCurrentInstitutionForUser(user.id, instId);
      await resetBotSession(user.id);
      return `Pronto! 🎉 Agora suas próximas compras apoiarão *${instName}*.\n\nEnvie o link do produto quando quiser comprar.`;
    }
    if (['não','nao','n','2'].includes(n)) { await resetBotSession(user.id); return `Tudo bem. Mantive sua instituição atual.\n\nEnvie *MENU* para ver as opções.`; }
    return `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
  }
  await resetBotSession(user.id);
  return `Algo deu errado. Envie *MENU* para recomeçar.`;
}

import { User } from '@/lib/db/users';
import { BotSession, updateBotSession, resetBotSession } from '@/lib/db/bot-sessions';
import {
  listActiveInstitutions,
  searchInstitutionByNameOrSlug,
  setCurrentInstitutionForUser,
} from '@/lib/db/institutions';

type P = { user: User; session: BotSession; messageText: string };

export async function handleChangeInstitution({ user, session, messageText }: P): Promise<string> {

  // Estado inicial — exibe lista pública numerada
  if (session.current_state === 'idle') {
    const institutions = await listActiveInstitutions();

    const list = institutions.length > 0
      ? institutions.map((inst, i) => `*${i + 1}.* ${inst.name}`).join('\n')
      : '_Nenhuma instituição disponível no momento._';

    await updateBotSession(user.id, 'awaiting_institution_choice', {
      institutions: institutions.map(i => ({ id: i.id, name: i.name })),
    });

    return [
      '🌱 *Escolha a instituição que deseja apoiar:*\n\n',
      list,
      '\n\nDigite o *número* da instituição ou *escreva o nome* caso não esteja na lista.',
    ].join('');
  }

  // Estado aguardando escolha
  if (session.current_state === 'awaiting_institution_choice') {
    const institutions = (session.context?.institutions as { id: string; name: string }[]) ?? [];
    const trimmed = messageText.trim();
    const choice = parseInt(trimmed, 10);

    let selected: { id: string; name: string } | null = null;

    // Tentativa 1 — número da lista pública
    if (!isNaN(choice) && choice >= 1 && choice <= institutions.length) {
      selected = institutions[choice - 1];
    }

    // Tentativa 2 — busca por nome (inclui ocultas)
    if (!selected) {
      const found = await searchInstitutionByNameOrSlug(trimmed);
      if (found) selected = { id: found.id, name: found.name };
    }

    if (!selected) {
      const list = institutions.map((inst, i) => `*${i + 1}.* ${inst.name}`).join('\n');
      return [
        '⚠️ Não encontrei essa instituição.\n\n',
        'Digite o *número* da lista ou tente escrever o nome completo:\n\n',
        list,
      ].join('');
    }

    await updateBotSession(user.id, 'awaiting_institution_confirmation', {
      institution_id: selected.id,
      institution_name: selected.name,
    });

    return [
      `Você escolheu: *${selected.name}* ✅\n\n`,
      'Deseja confirmar?\n\nResponda *SIM* ou *NÃO*.',
    ].join('');
  }

  // Estado aguardando confirmação
  if (session.current_state === 'awaiting_institution_confirmation') {
    const n = messageText.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const instName = session.context?.institution_name as string;
    const instId   = session.context?.institution_id   as string;

    if (['sim', 's', '1'].includes(n) && instId) {
      await setCurrentInstitutionForUser(user.id, instId);
      await resetBotSession(user.id);
      return `Pronto! 🎉 Agora suas próximas compras apoiarão *${instName}*.\n\nEnvie o link do produto quando quiser comprar.`;
    }

    if (['nao', 'n', 'não', '2'].includes(n)) {
      await resetBotSession(user.id);
      return 'Tudo bem! Mantive sua instituição atual.\n\nEnvie *MENU* para ver as opções.';
    }

    return 'Responda *SIM* para confirmar ou *NÃO* para cancelar.';
  }

  await resetBotSession(user.id);
  return 'Algo deu errado. Envie *MENU* para recomeçar.';
}
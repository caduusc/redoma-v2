/**
 * src/lib/bot/handlers/points.ts
 *
 * Handler de "ver pontos" — busca o saldo do usuário e formata a resposta.
 */

import { User } from '@/lib/db/users';
import { getUserPoints } from '@/lib/db/user-points';

type P = { user: User };

export async function handlePoints({ user }: P): Promise<string> {
  const points = await getUserPoints(user.id);

  // Usuário ainda não tem registro de pontos — trata como zero
  const available = points?.available_points ?? 0;
  const pending = points?.pending_points ?? 0;

  const firstName = user.full_name?.split(' ')[0] ?? 'amigo(a)';

  if (available === 0 && pending === 0) {
    return [
      `💙 *Olá, ${firstName}!*\n\n`,
      'Você ainda não tem pontos acumulados.\n\n',
      'Compre por um link gerado aqui e ganhe pontos a cada compra! 🛍️',
    ].join('');
  }

  const lines = [
    `💙 *Seus pontos, ${firstName}*\n\n`,
    `✅ *Disponíveis:* ${available}\n`,
  ];

  if (pending > 0) {
    lines.push(`⏳ *Pendentes:* ${pending}\n`);
    lines.push('\n_Pontos pendentes são creditados após a confirmação da compra._');
  }

  return lines.join('');
}
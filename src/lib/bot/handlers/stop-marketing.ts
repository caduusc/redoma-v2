import { User } from '@/lib/db/users';
import { disableMarketingForUser } from '@/lib/db/communication-preferences';
export async function handleStopMarketing({ user }: { user: User }): Promise<string> {
  await disableMarketingForUser(user.id);
  return `Tudo certo. ✅ Você não receberá mais mensagens promocionais da Redoma.\n\nQuando quiser comprar apoiando sua instituição, ainda poderá enviar mensagens por aqui.`;
}

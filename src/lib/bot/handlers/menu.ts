import { User } from '@/lib/db/users';
export async function handleMenu({ user }: { user: User }): Promise<string> {
  void user;
  return `*Menu Redoma* 🌱\n\ Envie uma das opções abaixo:\n• *APOIE a uma instituição*: É só enviar o link do produto que deseja comprar \n• *PONTOS* para ver seus Impact Points\n• *TROCAR:* para mudar a instituição que está apoiando\n• *PARAR* para não receber mensagens de marketing\n• *AJUDA* para entender como funciona`;
}

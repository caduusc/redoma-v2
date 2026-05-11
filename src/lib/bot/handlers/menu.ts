import { User } from '@/lib/db/users';
export async function handleMenu({ user }: { user: User }): Promise<string> {
  void user;
  return `*Menu Redoma* 🌱\n\nEnvie:\n• o link de um produto para comprar apoiando sua instituição\n• *PONTOS* para ver seus Impact Points\n• *TROCAR* para mudar de instituição\n• *PARAR* para não receber mensagens promocionais\n• *AJUDA* para entender como funciona`;
}

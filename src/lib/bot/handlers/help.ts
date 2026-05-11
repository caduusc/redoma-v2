import { User } from '@/lib/db/users';
export async function handleHelp({ user }: { user: User }): Promise<string> {
  void user;
  return `*Como funciona a Redoma* 💚\n\nA Redoma permite que você apoie uma instituição comprando normalmente, sem pagar nada a mais.\n\nBasta enviar aqui o link de um produto e eu vou te devolver o link correto para comprar gerando impacto.\n\nPor enquanto, este assistente está em fase de testes.\n\nEnvie *MENU* para ver as opções.`;
}

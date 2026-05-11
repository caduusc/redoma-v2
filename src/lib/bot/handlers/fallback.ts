import { User } from '@/lib/db/users';
export async function handleFallback({ user }: { user: User }): Promise<string> {
  void user;
  return `Não entendi sua mensagem. 🤔\n\nPara continuar:\n*MENU*\n*AJUDA*\n*PONTOS*\n*TROCAR*\n*PARAR*`;
}

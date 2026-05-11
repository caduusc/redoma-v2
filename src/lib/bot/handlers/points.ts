import { User } from '@/lib/db/users';
export async function handlePoints({ user }: { user: User }): Promise<string> {
  void user;
  return `*Seus Impact Points* 🌟\n\nSeus Impact Points estarão disponíveis em breve no painel da Redoma.\n\nPor enquanto, este assistente está em fase de testes.\n\nEnvie *MENU* para ver as opções.`;
}

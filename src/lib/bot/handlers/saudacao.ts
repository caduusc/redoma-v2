import { User } from '@/lib/db/users';

export async function handleSaudacao({ user }: { user: User }): Promise<string> {
  void user;
  return [
    'Olá! Como posso te ajudar hoje? 😊\n\n',
    'Se quiser apoiar uma instituição, basta me enviar o *link do produto* que deseja comprar.\n\n',
    'Se for outro assunto, digite *MENU* que eu te passo as opções.',
  ].join('');
}

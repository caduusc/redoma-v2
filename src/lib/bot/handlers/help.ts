import { User } from '@/lib/db/users';

export async function handleHelp({ user }: { user: User }): Promise<string> {
  void user;

  return `*Como funciona a Redoma* 💙

Você compra online normalmente e ajuda uma instituição sem pagar nada a mais.

Funciona assim:
1️⃣ Envie aqui o link do produto que quer comprar
2️⃣ Eu te devolvo um link personalizado da Redoma
3️⃣ Você compra por esse link e parte do valor vira apoio para a instituição escolhida

Lojas disponíveis: Mercado Livre, Amazon, Shopee, SHEIN, Magalu, Avon, Natura e Amo Beleza.

Caso ainda não tenha escolhido uma instituição para apoiar, envie *TROCAR* para ver as opções.`;
}
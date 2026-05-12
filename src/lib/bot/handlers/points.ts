import { User } from '@/lib/db/users';
export async function handlePoints({ user }: { user: User }): Promise<string> {
  void user;
  return `*Seus Impact Points* 🌟\n\nEnvie *MENU* para ver mais opções.`;
}

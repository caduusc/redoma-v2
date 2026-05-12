import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';

const ADMIN_PHONES = ['5511978060056', '5511944774344'];

export async function notifyAdmins(message: string): Promise<void> {
  await Promise.allSettled(
    ADMIN_PHONES.map(admin => sendWhatsAppMessage({ to: admin, body: message }))
  );
}

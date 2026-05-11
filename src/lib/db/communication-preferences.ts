import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function disableMarketingForUser(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('user_communication_preferences').update({ whatsapp_marketing_enabled: false, unsubscribed_marketing_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw new Error(`[comm-prefs] ${error.message}`);
}

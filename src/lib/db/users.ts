import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type User = { id: string; full_name: string | null; phone_normalized: string; created_at: string; updated_at: string; };

export async function getOrCreateUserByPhone(phoneNormalized: string): Promise<User> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase.from('users').select('*').eq('phone_normalized', phoneNormalized).single();
  if (error && error.code !== 'PGRST116') throw new Error(`[db/users] ${error.message}`);
  if (existing) return existing as User;
  const { data: newUser, error: ce } = await supabase.from('users').insert({ phone_normalized: phoneNormalized }).select('*').single();
  if (ce || !newUser) throw new Error(`[db/users] ${ce?.message}`);
  const user = newUser as User;
  await supabase.from('user_communication_preferences').insert({ user_id: user.id }).throwOnError();
  await supabase.from('bot_sessions').insert({ user_id: user.id, current_state: 'idle', context: {} }).throwOnError();
  console.log(`[db/users] Novo usuário: ${phoneNormalized}`);
  return user;
}

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type BotSession = { id: string; user_id: string; current_state: string; context: Record<string,unknown>; created_at: string; updated_at: string; };

export async function getOrCreateBotSession(userId: string): Promise<BotSession> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('bot_sessions').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw new Error(`[bot-sessions] ${error.message}`);
  if (data) return data as BotSession;
  const { data: created, error: ce } = await supabase.from('bot_sessions').insert({ user_id: userId, current_state: 'idle', context: {} }).select('*').single();
  if (ce || !created) throw new Error(`[bot-sessions] ${ce?.message}`);
  return created as BotSession;
}

export async function updateBotSession(userId: string, state: string, context?: Record<string,unknown>): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('bot_sessions').update({ current_state: state, ...(context !== undefined ? { context } : {}), updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw new Error(`[bot-sessions] ${error.message}`);
}

export async function resetBotSession(userId: string): Promise<void> { await updateBotSession(userId, 'idle', {}); }

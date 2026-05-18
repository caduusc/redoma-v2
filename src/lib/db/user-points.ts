/**
 * src/lib/db/user-points.ts
 *
 * Operações com a tabela user_points.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type UserPoints = {
  id: string;
  user_id: string;
  phone_normalized: string;
  pending_points: number;
  available_points: number;
  cancelled_points: number;
  created_at: string;
  updated_at: string;
};

/**
 * Busca o registro de pontos de um usuário.
 * Retorna null se o usuário ainda não tem registro.
 */
export async function getUserPoints(userId: string): Promise<UserPoints | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[db/user-points] Erro ao buscar pontos:', error);
    return null;
  }

  return data as UserPoints | null;
}

/**
 * Garante que o usuário tenha um registro em user_points (cria com zeros se não existir).
 * Útil para chamar quando um novo usuário se cadastra.
 */
export async function ensureUserPointsExists(
  userId: string,
  phoneNormalized: string
): Promise<UserPoints | null> {
  const existing = await getUserPoints(userId);
  if (existing) return existing;

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('user_points')
    .insert({
      user_id: userId,
      phone_normalized: phoneNormalized,
      pending_points: 0,
      available_points: 0,
      cancelled_points: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[db/user-points] Erro ao criar registro:', error);
    return null;
  }

  return data as UserPoints;
}
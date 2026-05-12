import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type Institution = { id: string; name: string; slug: string; logo_url: string | null; description: string | null; status: string; created_at: string; updated_at: string; };

export async function listActiveInstitutions(): Promise<Institution[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('institutions')
    .select('*')
    .eq('status', 'active')
    .order('name', { ascending: true });
  if (error) { console.error('[db/institutions]', error.message); return []; }
  return (data as Institution[]) ?? [];
}

export async function searchInstitutionByNameOrSlug(query: string): Promise<Institution | null> {
  if (!query?.trim()) return null;
  const term = `%${query.trim()}%`;
  const { data, error } = await getSupabaseAdmin().from('institutions').select('*').eq('status', 'active').or(`name.ilike.${term},slug.ilike.${term}`).limit(1).maybeSingle();
  if (error) { console.error('[db/institutions]', error.message); return null; }
  return (data as Institution) ?? null;
}

export async function getCurrentInstitutionForUser(userId: string): Promise<Institution | null> {
  const { data } = await getSupabaseAdmin().from('user_institution_preferences').select('current_institution_id').eq('user_id', userId).maybeSingle();
  if (!data?.current_institution_id) return null;
  const { data: inst } = await getSupabaseAdmin().from('institutions').select('*').eq('id', data.current_institution_id).maybeSingle();
  return (inst as Institution) ?? null;
}

export async function setCurrentInstitutionForUser(userId: string, institutionId: string): Promise<void> {
  const { data: existing } = await getSupabaseAdmin().from('user_institution_preferences').select('origin_institution_id').eq('user_id', userId).maybeSingle();
  const originId = existing?.origin_institution_id ?? institutionId;
  const { error } = await getSupabaseAdmin().from('user_institution_preferences').upsert({ user_id: userId, current_institution_id: institutionId, origin_institution_id: originId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(`[db/institutions] ${error.message}`);
}
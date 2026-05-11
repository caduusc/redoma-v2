/**
 * src/lib/db/generated-links.ts
 * Operações de banco para links rastreáveis.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { nanoid } from 'nanoid';

export type PartnerStore = {
  id: string;
  name: string;
  domain: string;
  status: string;
  supports_deeplink: boolean;
  created_at: string;
};

export type GeneratedLink = {
  id: string;
  user_id: string | null;
  institution_id: string | null;
  partner_store_id: string | null;
  original_url: string;
  affiliate_url: string | null;
  tracking_code: string;
  short_url: string | null;
  status: string;
  created_at: string;
};

export async function findPartnerStoreByDomain(
  url: string
): Promise<PartnerStore | null> {
  const supabase = getSupabaseAdmin();

  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    console.error('[db/generated-links] URL inválida:', url);
    return null;
  }

  const { data, error } = await supabase
    .from('partner_stores')
    .select('*')
    .eq('status', 'active')
    .eq('domain', hostname)
    .maybeSingle();

  if (error) {
    console.error('[db/generated-links] Erro ao buscar loja:', error.message);
    return null;
  }

  return (data as PartnerStore) ?? null;
}

export async function createGeneratedLink(params: {
  userId: string;
  institutionId: string | null;
  partnerStoreId: string | null;
  originalUrl: string;
  affiliateUrl: string | null;
  appUrl: string;
}): Promise<GeneratedLink> {
  const supabase = getSupabaseAdmin();
  const trackingCode = nanoid(10);
  const shortUrl = `${params.appUrl}/r/${trackingCode}`;

  const { data, error } = await supabase
    .from('generated_links')
    .insert({
      user_id: params.userId,
      institution_id: params.institutionId,
      partner_store_id: params.partnerStoreId,
      original_url: params.originalUrl,
      affiliate_url: params.affiliateUrl,
      tracking_code: trackingCode,
      short_url: shortUrl,
      status: 'active',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`[db/generated-links] Erro ao criar link: ${error?.message}`);
  }

  return data as GeneratedLink;
}

export async function findGeneratedLinkByCode(
  trackingCode: string
): Promise<GeneratedLink | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('generated_links')
    .select('*')
    .eq('tracking_code', trackingCode)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[db/generated-links] Erro ao buscar link:', error.message);
    return null;
  }

  return (data as GeneratedLink) ?? null;
}

export async function recordLinkClick(params: {
  generatedLinkId: string;
  userId: string | null;
  institutionId: string | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('link_clicks').insert({
    generated_link_id: params.generatedLinkId,
    user_id: params.userId,
    institution_id: params.institutionId,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
  });

  if (error) {
    console.error('[db/generated-links] Erro ao registrar clique:', error.message);
  }
}

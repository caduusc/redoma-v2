/**
 * src/app/r/[code]/route.ts
 *
 * Rota de redirecionamento de links rastreáveis.
 * GET /r/:code → registra clique → redireciona para o link de afiliado real
 */

import { NextRequest, NextResponse } from 'next/server';
import { findGeneratedLinkByCode, recordLinkClick } from '@/lib/db/generated-links';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const link = await findGeneratedLinkByCode(code);

  if (!link) {
    return new NextResponse('Link não encontrado ou expirado.', { status: 404 });
  }

  // affiliate_url = link real de afiliado (gerado pelo Playwright) — preferencial
  // original_url  = URL original do produto                         — fallback
  const destinationUrl = link.affiliate_url ?? link.original_url;

  // Busca instituição do usuário para registrar no clique
  let institutionId: string | null = link.institution_id;
  if (link.user_id && !institutionId) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('user_institution_preferences')
      .select('current_institution_id')
      .eq('user_id', link.user_id)
      .maybeSingle();
    institutionId = data?.current_institution_id ?? null;
  }

  // Registra clique sem bloquear o redirect
  recordLinkClick({
    generatedLinkId: link.id,
    userId: link.user_id,
    institutionId,
    ipAddress:
      req.headers.get('x-forwarded-for') ??
      req.headers.get('x-real-ip') ??
      undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  return NextResponse.redirect(destinationUrl, { status: 302 });
}

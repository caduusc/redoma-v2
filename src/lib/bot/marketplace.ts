/**
 * src/lib/bot/marketplace.ts
 *
 * Detecção de marketplace por URL e geração de link de afiliado
 * via serviço Python local (localhost:8001).
 */

export type Marketplace = 'mercadolivre' | 'amazon' | 'shopee' | 'magalu';

export type AffiliateResult =
  | { success: true; affiliateLink: string }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────
// Padrões de URL por marketplace — portado de MARKETPLACE_PATTERNS (main.py)
// ─────────────────────────────────────────────────────────────────────

const MARKETPLACE_PATTERNS: Record<Marketplace, RegExp[]> = {
  mercadolivre: [
    /https?:\/\/[^\s]*mercadolivre\.com\.br[^\s]*/gi,
    /https?:\/\/meli\.la\/[^\s]*/gi,
  ],
  amazon: [
    /https?:\/\/[^\s]*amazon\.com\.br[^\s]*/gi,
    /https?:\/\/[^\s]*amzn\.[^\s]*/gi,
  ],
  shopee: [
    /https?:\/\/[^\s]*shopee\.com\.br[^\s]*/gi,
    /https?:\/\/[^\s]*shp\.ee[^\s]*/gi,
  ],
  magalu: [
    /https?:\/\/[^\s]*magazineluiza\.com\.br[^\s]*/gi,
    /https?:\/\/[^\s]*magazinevoce\.com\.br[^\s]*/gi,
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Identifica marketplace e extrai URL do produto
// ─────────────────────────────────────────────────────────────────────

export function identifyMarketplace(
  text: string
): { marketplace: Marketplace; productUrl: string } | null {
  for (const [marketplace, patterns] of Object.entries(MARKETPLACE_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match) {
        return {
          marketplace: marketplace as Marketplace,
          productUrl: match[0].trim(),
        };
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Chama o serviço Python para gerar o link de afiliado real
// ─────────────────────────────────────────────────────────────────────

const AFFILIATE_API_URL = process.env.AFFILIATE_API_URL ?? 'http://localhost:8001';

export async function generateAffiliateLink(params: {
  marketplace: Marketplace;
  productUrl: string;
  tag: string | null;
}): Promise<AffiliateResult> {
  try {
    const res = await fetch(`${AFFILIATE_API_URL}/generate-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketplace: params.marketplace,
        product_url: params.productUrl,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      return { success: false, error: `Serviço retornou ${res.status}` };
    }

    const data = (await res.json()) as {
      success: boolean;
      affiliate_link?: string;
      error?: string;
    };

    if (data.success && data.affiliate_link) {
      return { success: true, affiliateLink: data.affiliate_link };
    }

    return { success: false, error: data.error ?? 'Link não gerado — motivo desconhecido.' };

  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return { success: false, error: 'Tempo esgotado ao gerar link de afiliado (>45s).' };
    }
    console.error('[marketplace] Erro ao chamar serviço:', err);
    return { success: false, error: 'Serviço indisponível. Tente novamente.' };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Verifica se o serviço Python está online
// ─────────────────────────────────────────────────────────────────────

export async function checkAffiliateServiceHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${AFFILIATE_API_URL}/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

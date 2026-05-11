import { extractFirstUrl } from '@/lib/utils/extract-url';

export type BotIntent = 'URL_PRODUTO' | 'TROCAR_INSTITUICAO' | 'VER_PONTOS' | 'PARAR_MARKETING' | 'MENU' | 'AJUDA' | 'FALLBACK';

function normalizeText(text: string): string {
  return text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

const TROCAR = new Set(['trocar','mudar','trocar instituicao','mudar instituicao']);
const PONTOS = new Set(['pontos','meus pontos','saldo','impact points','impactpoints']);
const PARAR  = new Set(['parar','sair','cancelar','stop','unsubscribe']);
const MENU   = new Set(['menu','inicio','comecar']);
const AJUDA  = new Set(['ajuda','help','como funciona']);

export function detectIntent(message: string): BotIntent {
  if (extractFirstUrl(message)) return 'URL_PRODUTO';
  const n = normalizeText(message);
  if (TROCAR.has(n)) return 'TROCAR_INSTITUICAO';
  if (PONTOS.has(n)) return 'VER_PONTOS';
  if (PARAR.has(n))  return 'PARAR_MARKETING';
  if (MENU.has(n))   return 'MENU';
  if (AJUDA.has(n))  return 'AJUDA';
  return 'FALLBACK';
}

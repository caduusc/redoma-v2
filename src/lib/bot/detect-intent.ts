import { extractFirstUrl } from '@/lib/utils/extract-url';

export type BotIntent =
  | 'URL_PRODUTO'
  | 'TROCAR_INSTITUICAO'
  | 'VER_PONTOS'
  | 'PARAR_MARKETING'
  | 'MENU'
  | 'SAUDACAO'
  | 'AJUDA'
  | 'FALLBACK';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function matchesAny(text: string, terms: string[]): boolean {
  return terms.some(term => text === term || text.includes(term));
}

const SAUDACAO_TERMS = [
  'oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hi', 'hello',
  'e ai', 'eai', 'e aí', 'opa', 'tudo bem', 'td bem', 'oi bot', 'ola bot',
  'boas', 'salve', 'oi tudo bem', 'boa', 'bom dia!', 'boa tarde!', 'boa noite!',
  'oii', 'oiii', 'oi!', 'ola!', 'olá!', 'hey!', 'eae', 'eaee', 'ae', 'iae',
];

const TROCAR_TERMS = [
  'trocar', 'trocar instituicao', 'trocar instituição', 'mudar', 'mudar instituicao',
  'mudar instituição', 'alterar instituicao', 'alterar instituição', 'trocar escola',
  'mudar escola', 'alterar escola', 'trocar entidade', 'mudar entidade', 'trocar org',
  'mudar org', 'trocar organizacao', 'mudar organizacao', 'quero trocar', 'quero mudar',
  'trocar minha instituicao', 'mudar minha instituicao', 'alterar minha instituicao',
  'troca instituicao', 'muda instituicao', 'change', 'trocar insttuicao', 'mudar instuicao',
];

const PONTOS_TERMS = [
  'pontos', 'meus pontos', 'saldo', 'ver pontos', 'quantos pontos', 'meu saldo',
  'impact points', 'impactpoints', 'impacts', 'quanto tenho', 'minhas contribuicoes',
  'contribuicoes', 'minhas contribuições', 'ver saldo', 'checar pontos', 'consultar pontos',
  'ver meus pontos', 'quero ver pontos', 'mostrar pontos', 'mostra pontos',
  'quanto eu tenho', 'ponots', 'pntos', 'ver pont', 'pts',
];

const PARAR_TERMS = [
  'parar', 'sair', 'cancelar', 'stop', 'unsubscribe', 'nao quero mais', 'não quero mais',
  'remover', 'descadastrar', 'descadastro', 'sair da lista', 'parar mensagens',
  'cancelar mensagens', 'nao quero receber', 'não quero receber', 'para', 'chega',
  'nao me mande mais', 'não me mande mais', 'excluir', 'deletar', 'desinscrever',
  'opt out', 'optout', 'parar de receber', 'quero sair', 'me remove', 'me exclui',
  'cancela', 'cancela tudo', 'para tudo',
];

const MENU_TERMS = [
  'menu', 'inicio', 'comecar', 'começar', 'voltar', 'voltar ao menu', 'ver menu',
  'mostrar menu', 'opcoes', 'opções', 'ver opcoes', 'ver opções', '0', 'home',
  'start', 'iniciar', 'menu principal', 'pagina inicial', 'página inicial',
  'recomecar', 'recomeçar',
];

const AJUDA_TERMS = [
  'ajuda', 'help', 'como funciona', 'como usar', 'nao entendi', 'não entendi',
  'me ajuda', 'me ajude', 'preciso de ajuda', 'suporte', 'duvida', 'dúvida',
  'o que e isso', 'o que é isso', 'o que voce faz', 'o que você faz', 'info',
  'informacoes', 'informações', 'tutorial', 'instrucoes', 'instruções',
  'como faz', 'como faço', 'como faco', 'nao sei', 'não sei', 'explica',
  'me explica', 'explique', 'me explique', 'como funciona isso', 'ajd', 'hlp',
  'socorro', 'lost', 'confuso', 'nao entendo', 'não entendo', 'pode ajudar',
  'preciso de suporte', 'falar com atendente', 'atendimento', 'atendente',
  'falar com humano', 'humano', 'pessoa', 'falar com pessoa',
];

export function detectIntent(message: string): BotIntent {
  if (extractFirstUrl(message)) return 'URL_PRODUTO';

  const n = normalizeText(message);

  // Saudação antes de MENU para não confundir "oi" com menu
  if (matchesAny(n, SAUDACAO_TERMS))  return 'SAUDACAO';
  if (matchesAny(n, TROCAR_TERMS))    return 'TROCAR_INSTITUICAO';
  if (matchesAny(n, PONTOS_TERMS))    return 'VER_PONTOS';
  if (matchesAny(n, PARAR_TERMS))     return 'PARAR_MARKETING';
  if (matchesAny(n, MENU_TERMS))      return 'MENU';
  if (matchesAny(n, AJUDA_TERMS))     return 'AJUDA';

  return 'FALLBACK';
}
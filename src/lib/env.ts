const isDev = process.env.BOT_ENV === 'development' || process.env.NODE_ENV === 'development';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`[env] VariÃ¡vel obrigatÃ³ria nÃ£o encontrada: ${key}`);
  return value;
}
function optionalEnv(key: string, fallback = ''): string { return process.env[key] ?? fallback; }
function warnIfMissing(key: string): string {
  const value = process.env[key] ?? '';
  if (!value && !isDev) console.warn(`[env] ${key} nÃ£o configurada.`);
  return value;
}

export const env = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: optionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  appUrl: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  zapiInstanceId: warnIfMissing('ZAPI_INSTANCE_ID'),
  zapiToken: warnIfMissing('ZAPI_TOKEN'),
  zapiClientToken: optionalEnv('ZAPI_CLIENT_TOKEN'),
  whatsappToken: optionalEnv('WHATSAPP_TOKEN'),
  whatsappPhoneNumberId: optionalEnv('WHATSAPP_PHONE_NUMBER_ID'),
  whatsappVerifyToken: optionalEnv('WHATSAPP_VERIFY_TOKEN', 'redoma_dev_token'),
  whatsappApiVersion: optionalEnv('WHATSAPP_API_VERSION', 'v21.0'),
  botEnv: optionalEnv('BOT_ENV', 'development'),
  isDev,
};

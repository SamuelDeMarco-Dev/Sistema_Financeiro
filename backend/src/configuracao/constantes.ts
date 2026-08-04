/** RF-02: validade do token enviado por e-mail para confirmar a conta. */
export const HORAS_EXPIRACAO_TOKEN_VERIFICACAO = 24;

/** RN-54: tentativas de login falhas por e-mail. */
export const LIMITE_TENTATIVAS_LOGIN = 5;
export const MINUTOS_BLOQUEIO_LOGIN = 15;

/** 05-DEVELOPMENT.md / 04-API.md §5: cookie do refresh token. */
export const NOME_COOKIE_REFRESH = 'refreshToken';
export const CAMINHO_COOKIE_REFRESH = '/api/v1/autenticacao';

/** Rate limit de POST /autenticacao/renovar (issue #13), por IP. */
export const LIMITE_RENOVACAO_POR_IP = 30;
export const MINUTOS_JANELA_RENOVACAO = 15;

/** RF-07: validade do token de recuperacao de senha. */
export const HORAS_EXPIRACAO_TOKEN_RECUPERACAO = 1;

/** Rate limit de POST /autenticacao/reenviar-verificacao, por IP+e-mail. */
export const LIMITE_REENVIO_VERIFICACAO = 3;
export const MINUTOS_JANELA_REENVIO_VERIFICACAO = 60;

/** RF-11: upload de avatar (issue #17). */
export const TAMANHO_THUMBNAIL_AVATAR_PX = 128;
export const TIPOS_MIME_AVATAR_PERMITIDOS: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
export const LIMITE_UPLOADS_AVATAR_POR_HORA = 50;
export const MINUTOS_JANELA_UPLOAD_AVATAR = 60;

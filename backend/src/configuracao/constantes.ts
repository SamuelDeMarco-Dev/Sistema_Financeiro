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

/** RF-32: anexos de movimentacao (issue #40). */
export const LIMITE_ANEXOS_POR_MOVIMENTACAO = 5;
export const TIPOS_MIME_ANEXO_PERMITIDOS: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
export const EXTENSOES_POR_MIME_ANEXO: ReadonlyMap<string, string> = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
]);
export const LIMITE_UPLOADS_ANEXO_POR_HORA = 50;
export const MINUTOS_JANELA_UPLOAD_ANEXO = 60;

/** RN-35: validade do convite de conta compartilhada (issue #70). */
export const DIAS_EXPIRACAO_CONVITE = 7;

/** Rate limit de POST .../convites, por usuario (04-API.md §26). */
export const LIMITE_CONVITES_POR_HORA = 20;
export const MINUTOS_JANELA_CONVITES = 60;

/** RF-55 (issue #71): GET /convites/token/:token e publica e o token e o
 * unico segredo que o protege — limite estrito por IP, sem chave extra
 * (nao ha usuario autenticado aqui para compor a chave). */
export const LIMITE_PREVISUALIZACAO_CONVITE_POR_IP = 20;
export const MINUTOS_JANELA_PREVISUALIZACAO_CONVITE = 15;

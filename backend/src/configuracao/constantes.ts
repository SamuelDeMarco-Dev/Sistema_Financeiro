/** RF-02: validade do token enviado por e-mail para confirmar a conta. */
export const HORAS_EXPIRACAO_TOKEN_VERIFICACAO = 24;

/** RN-54: tentativas de login falhas por e-mail. */
export const LIMITE_TENTATIVAS_LOGIN = 5;
export const MINUTOS_BLOQUEIO_LOGIN = 15;

/** 05-DEVELOPMENT.md / 04-API.md §5: cookie do refresh token. */
export const NOME_COOKIE_REFRESH = 'refreshToken';
export const CAMINHO_COOKIE_REFRESH = '/api/v1/autenticacao';

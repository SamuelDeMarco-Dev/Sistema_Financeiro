import { ErroAplicacao } from './erro-aplicacao';
import type { CodigoErro } from './codigos';

export { ErroAplicacao } from './erro-aplicacao';
export type { DetalheErro } from './erro-aplicacao';
export { CODIGOS_ERRO } from './codigos';
export type { CodigoErro } from './codigos';

/** 400 — entrada invalida (Zod ou regra de formato). */
export class ValidacaoErro extends ErroAplicacao {
  readonly statusHttp = 400;
  readonly codigo: CodigoErro = 'VALIDACAO';
}

/** 401 — token ausente, invalido ou expirado. */
export class NaoAutenticadoErro extends ErroAplicacao {
  readonly statusHttp = 401;
  readonly codigo: CodigoErro = 'NAO_AUTENTICADO';
}

/** 403 — autenticado, mas sem permissao sobre o recurso (RN-51: use
 * NaoEncontradoErro quando o usuario nao deveria nem saber que o recurso
 * existe). */
export class ProibidoErro extends ErroAplicacao {
  readonly statusHttp = 403;
  readonly codigo: CodigoErro = 'PROIBIDO';
}

/** 404 — recurso inexistente ou fora do escopo do usuario. */
export class NaoEncontradoErro extends ErroAplicacao {
  readonly statusHttp = 404;
  readonly codigo: CodigoErro = 'NAO_ENCONTRADO';
}

/** 409 — violacao de unicidade ou estado incompativel. */
export class ConflitoErro extends ErroAplicacao {
  readonly statusHttp = 409;
  readonly codigo: CodigoErro = 'CONFLITO';
}

/** 422 — requisicao bem formada, regra de dominio violada. */
export class RegraNegocioErro extends ErroAplicacao {
  readonly statusHttp = 422;
  readonly codigo: CodigoErro = 'REGRA_NEGOCIO';
}

/** 429 — rate limit. */
export class LimiteExcedidoErro extends ErroAplicacao {
  readonly statusHttp = 429;
  readonly codigo: CodigoErro = 'LIMITE_EXCEDIDO';
}

/** 500 — falha inesperada. */
export class ErroInterno extends ErroAplicacao {
  readonly statusHttp = 500;
  readonly codigo: CodigoErro = 'ERRO_INTERNO';
}

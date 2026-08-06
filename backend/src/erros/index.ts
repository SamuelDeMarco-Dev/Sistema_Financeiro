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

/** 409 — RF-17: exclusao bloqueada porque o recurso tem vinculos (ex.:
 * conta com movimentacoes) — a mensagem deve sugerir a alternativa. */
export class RecursoEmUsoErro extends ErroAplicacao {
  readonly statusHttp = 409;
  readonly codigo: CodigoErro = 'RECURSO_EM_USO';
}

/** 409 — e-mail ja pertence a outro cadastro. */
export class EmailJaCadastradoErro extends ErroAplicacao {
  readonly statusHttp = 409;
  readonly codigo: CodigoErro = 'EMAIL_JA_CADASTRADO';
}

/** 401 — e-mail inexistente ou senha errada. Mesma mensagem para os dois
 * casos (RN): nao da para um atacante distinguir se o e-mail existe. */
export class CredenciaisInvalidasErro extends ErroAplicacao {
  readonly statusHttp = 401;
  readonly codigo: CodigoErro = 'CREDENCIAIS_INVALIDAS';
}

/** 403 — RF-02: acesso bloqueado ate a confirmacao do e-mail. */
export class EmailNaoVerificadoErro extends ErroAplicacao {
  readonly statusHttp = 403;
  readonly codigo: CodigoErro = 'EMAIL_NAO_VERIFICADO';
}

/** 401 — access token expirado: distinto de NAO_AUTENTICADO porque o
 * cliente deve reagir diferente (tentar renovar, nao encerrar a sessao). */
export class TokenExpiradoErro extends ErroAplicacao {
  readonly statusHttp = 401;
  readonly codigo: CodigoErro = 'TOKEN_EXPIRADO';
}

/** 403 — RN-54: bloqueio temporario por excesso de tentativas de login. */
export class ContaBloqueadaErro extends ErroAplicacao {
  readonly statusHttp = 403;
  readonly codigo: CodigoErro = 'CONTA_BLOQUEADA';

  constructor(mensagem: string, desbloqueiaEm: Date) {
    super(mensagem, undefined, { desbloqueiaEm: desbloqueiaEm.toISOString() });
  }
}

/** 413 — upload acima do limite (issue #17: avatar; issue de anexos usa
 * a mesma classe). */
export class ArquivoMuitoGrandeErro extends ErroAplicacao {
  readonly statusHttp = 413;
  readonly codigo: CodigoErro = 'ARQUIVO_MUITO_GRANDE';
}

/** 415 — MIME real (magic number) fora da lista aceita. */
export class TipoArquivoInvalidoErro extends ErroAplicacao {
  readonly statusHttp = 415;
  readonly codigo: CodigoErro = 'TIPO_ARQUIVO_INVALIDO';
}

/** 422 — requisicao bem formada, regra de dominio violada. */
export class RegraNegocioErro extends ErroAplicacao {
  readonly statusHttp = 422;
  readonly codigo: CodigoErro = 'REGRA_NEGOCIO';
}

/** 422 — RN-10: categoria de RECEITA/DESPESA usada no tipo errado de
 * movimentacao (categorias AMBOS nunca disparam este erro). */
export class CategoriaIncompativelErro extends ErroAplicacao {
  readonly statusHttp = 422;
  readonly codigo: CodigoErro = 'CATEGORIA_INCOMPATIVEL';
}

/** 422 — conta existe e pertence ao usuario, mas esta arquivada: nao pode
 * receber novos lancamentos ate ser desarquivada. */
export class ContaArquivadaErro extends ErroAplicacao {
  readonly statusHttp = 422;
  readonly codigo: CodigoErro = 'CONTA_ARQUIVADA';
}

/** 422 — RN-24: conta de origem e destino de uma transferencia devem ser
 * diferentes. */
export class ContasIguaisErro extends ErroAplicacao {
  readonly statusHttp = 422;
  readonly codigo: CodigoErro = 'CONTAS_IGUAIS';
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

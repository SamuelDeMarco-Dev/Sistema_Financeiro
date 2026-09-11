import type { CodigoErro } from './codigos';

export interface DetalheErro {
  campo: string;
  mensagem: string;
}

export abstract class ErroAplicacao extends Error {
  abstract readonly statusHttp: number;
  abstract readonly codigo: CodigoErro;
  readonly detalhes: DetalheErro[] | undefined;
  /** Metadado fora de `errors` (ex.: `meta.desbloqueiaEm` em CONTA_BLOQUEADA,
   * 04-API.md §7.2) — a maioria dos erros nao usa isto. */
  readonly meta: Record<string, unknown> | undefined;

  constructor(mensagem: string, detalhes?: DetalheErro[], meta?: Record<string, unknown>) {
    super(mensagem);
    this.name = this.constructor.name;
    this.detalhes = detalhes;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

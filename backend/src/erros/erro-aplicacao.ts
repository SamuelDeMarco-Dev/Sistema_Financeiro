import type { CodigoErro } from './codigos';

export interface DetalheErro {
  campo: string;
  mensagem: string;
}

export abstract class ErroAplicacao extends Error {
  abstract readonly statusHttp: number;
  abstract readonly codigo: CodigoErro;
  readonly detalhes: DetalheErro[] | undefined;

  constructor(mensagem: string, detalhes?: DetalheErro[]) {
    super(mensagem);
    this.name = this.constructor.name;
    this.detalhes = detalhes;
    Error.captureStackTrace(this, this.constructor);
  }
}

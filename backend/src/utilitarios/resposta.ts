import type { CodigoErro, DetalheErro } from '@/erros';

export interface RespostaSucesso<T> {
  success: true;
  message: string;
  data: T;
  meta?: object;
}

export interface RespostaErro {
  success: false;
  message: string;
  codigo: CodigoErro;
  errors?: DetalheErro[];
}

export function respostaSucesso<T>(dados: T, mensagem: string, meta?: object): RespostaSucesso<T> {
  return meta
    ? { success: true, message: mensagem, data: dados, meta }
    : { success: true, message: mensagem, data: dados };
}

export function respostaErro(
  mensagem: string,
  detalhes: DetalheErro[] | undefined,
  codigo: CodigoErro,
): RespostaErro {
  return detalhes
    ? { success: false, message: mensagem, codigo, errors: detalhes }
    : { success: false, message: mensagem, codigo };
}

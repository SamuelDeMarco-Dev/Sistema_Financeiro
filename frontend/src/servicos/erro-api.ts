import axios from 'axios';

export interface DetalheErroApi {
  campo: string;
  mensagem: string;
}

interface CorpoErroBackend {
  message?: string;
  codigo?: string;
  errors?: DetalheErroApi[];
}

/** Forma normalizada de qualquer falha de rede/API — nenhum consumidor deve
 * tratar AxiosError diretamente (04-API.md §3.1: o cliente ramifica por `codigo`). */
export class ErroApi extends Error {
  readonly codigo: string;
  readonly status: number | undefined;
  readonly errors: DetalheErroApi[] | undefined;

  constructor(mensagem: string, codigo: string, status?: number, errors?: DetalheErroApi[]) {
    super(mensagem);
    this.name = 'ErroApi';
    this.codigo = codigo;
    this.status = status;
    this.errors = errors;
  }
}

export function normalizarErro(erro: unknown): ErroApi {
  if (!axios.isAxiosError(erro)) {
    return new ErroApi('Ocorreu um erro inesperado.', 'ERRO_DESCONHECIDO');
  }

  if (!erro.response) {
    return new ErroApi('Nao foi possivel conectar ao servidor. Verifique sua conexao.', 'ERRO_REDE');
  }

  const corpo = erro.response.data as CorpoErroBackend | undefined;
  if (corpo?.codigo) {
    return new ErroApi(
      corpo.message ?? 'Erro ao comunicar com o servidor.',
      corpo.codigo,
      erro.response.status,
      corpo.errors,
    );
  }

  return new ErroApi('Erro inesperado ao comunicar com o servidor.', 'ERRO_DESCONHECIDO', erro.response.status);
}

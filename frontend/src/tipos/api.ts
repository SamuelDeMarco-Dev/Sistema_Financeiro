// Espelha o envelope de 04-API.md §2 — cada servico de dominio (issue por
// issue) usa isso para devolver `data` desempacotado ao hook, nunca a
// resposta bruta do Axios.
export interface Paginacao {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  temProxima: boolean;
  temAnterior: boolean;
}

export interface MetaResposta {
  paginacao?: Paginacao;
  totalizadores?: Record<string, string>;
}

export interface RespostaSucesso<T> {
  success: true;
  message: string;
  data: T;
  meta?: MetaResposta;
}

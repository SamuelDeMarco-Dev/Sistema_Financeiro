import axios from 'axios';
import type { RespostaSucesso } from '@/tipos/api';

export interface RespostaRenovacao {
  accessToken: string;
  expiraEm: number;
}

/**
 * Chamada crua (sem os interceptores de `api`) a POST /autenticacao/renovar.
 * Usada tanto no boot da sessao (ContextoAutenticacao) quanto pelo proprio
 * interceptor de renovacao reativa — por isso fica fora de
 * autenticacao.servico.ts: aquele arquivo importa `api`, e `api.ts` importa
 * o interceptor, que importaria este modulo de volta, fechando um ciclo.
 * Isolado aqui, so depende do axios cru.
 */
export async function renovarSessao(baseURL: string): Promise<RespostaRenovacao> {
  const resposta = await axios.post<RespostaSucesso<RespostaRenovacao>>(
    `${baseURL}/autenticacao/renovar`,
    {},
    { withCredentials: true },
  );
  return resposta.data.data;
}

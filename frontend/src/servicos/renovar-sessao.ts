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
async function chamarRenovar(baseURL: string): Promise<RespostaRenovacao> {
  const resposta = await axios.post<RespostaSucesso<RespostaRenovacao>>(
    `${baseURL}/autenticacao/renovar`,
    {},
    { withCredentials: true },
  );
  return resposta.data.data;
}

/**
 * Renovacao em voo, compartilhada por TODOS os chamadores.
 *
 * A fila unica do interceptor (02-ARCHITECTURE.md §6.4) cobre apenas as
 * requisicoes que levaram 401 — o boot da sessao (ContextoAutenticacao)
 * chama `renovarSessao` direto, fora dela. Com duas chamadas em paralelo, a
 * segunda leva o refresh token que a primeira acabou de rotacionar; o
 * backend trata isso como reuso de token revogado e invalida a familia
 * inteira (RN-53), derrubando a sessao de verdade — nao e so uma chamada
 * desperdicada.
 *
 * Acontece a cada carga de pagina em desenvolvimento, onde o StrictMode
 * invoca o efeito de boot duas vezes. A rotacao multipla, porem, e um risco
 * do contrato, nao do modo de execucao: qualquer caminho que renove em
 * paralelo derruba a sessao. Por isso a protecao vive aqui, no unico modulo
 * por onde todos os caminhos passam, e nao no chamador.
 */
let renovacaoEmVoo: Promise<RespostaRenovacao> | null = null;

export async function renovarSessao(baseURL: string): Promise<RespostaRenovacao> {
  renovacaoEmVoo ??= chamarRenovar(baseURL).finally(() => {
    renovacaoEmVoo = null;
  });
  return renovacaoEmVoo;
}

/** Apenas para testes: zera a renovacao em voo entre casos, ja que o estado
 * acima e de modulo e sobreviveria de um teste para o seguinte. */
export function redefinirRenovacaoEmVoo(): void {
  renovacaoEmVoo = null;
}

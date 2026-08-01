import axios from 'axios';
import { armazenamentoToken } from './armazenamento-token';
import { normalizarErro } from './erro-api';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

interface RequisicaoComRetentativa extends InternalAxiosRequestConfig {
  _jaTentouRenovar?: boolean;
}

/**
 * Fila unica de renovacao: varias requisicoes que recebem 401 ao mesmo tempo
 * aguardam UMA chamada a /autenticacao/renovar, nao uma por requisicao —
 * renovacoes paralelas rotacionariam o refresh token multiplas vezes e
 * derrubariam a sessao (02-ARCHITECTURE.md §6.4).
 */
export function criarInterceptorRenovacao(instancia: AxiosInstance) {
  let promessaRenovacao: Promise<string> | null = null;

  async function renovar(): Promise<string> {
    // Instancia crua (sem os interceptores de `instancia`) para nao entrar
    // em recursao caso a propria renovacao responda 401.
    const resposta = await axios.post<{ data: { accessToken: string } }>(
      `${instancia.defaults.baseURL}/autenticacao/renovar`,
      {},
      { withCredentials: true },
    );
    const novoToken = resposta.data.data.accessToken;
    armazenamentoToken.definir(novoToken);
    return novoToken;
  }

  return async function interceptorErro(erro: AxiosError): Promise<unknown> {
    const requisicaoOriginal = erro.config as RequisicaoComRetentativa | undefined;

    const naoRenovavel =
      erro.response?.status !== 401 || !requisicaoOriginal || requisicaoOriginal._jaTentouRenovar === true;
    if (naoRenovavel) {
      return Promise.reject(normalizarErro(erro));
    }

    requisicaoOriginal._jaTentouRenovar = true;

    try {
      promessaRenovacao ??= renovar().finally(() => {
        promessaRenovacao = null;
      });
      const novoToken = await promessaRenovacao;

      requisicaoOriginal.headers.set('Authorization', `Bearer ${novoToken}`);
      return await instancia(requisicaoOriginal);
    } catch {
      armazenamentoToken.definir(null);
      return Promise.reject(normalizarErro(erro));
    }
  };
}

import { armazenamentoToken } from './armazenamento-token';
import { normalizarErro } from './erro-api';
import { notificarSessaoExpirada } from './evento-sessao-expirada';
import { renovarSessao } from './renovar-sessao';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

interface RequisicaoComRetentativa extends InternalAxiosRequestConfig {
  _jaTentouRenovar?: boolean;
}

// Rotas publicas de autenticacao: um 401 aqui e credencial invalida ou
// token de fluxo expirado, nunca "access token expirado" — tentar renovar
// so gastaria uma chamada a mais e, se o refresh tambem falhar (visitante
// sem sessao), dispararia um sessao-expirada indevido para quem nunca
// esteve logado.
const ROTAS_SEM_RENOVACAO = [
  '/autenticacao/entrar',
  '/autenticacao/cadastrar',
  '/autenticacao/renovar',
  '/autenticacao/verificar-email',
  '/autenticacao/reenviar-verificacao',
  '/autenticacao/esqueci-senha',
  '/autenticacao/redefinir-senha',
];

/**
 * Fila unica de renovacao: varias requisicoes que recebem 401 ao mesmo tempo
 * aguardam UMA chamada a /autenticacao/renovar, nao uma por requisicao —
 * renovacoes paralelas rotacionariam o refresh token multiplas vezes e
 * derrubariam a sessao (02-ARCHITECTURE.md §6.4).
 */
export function criarInterceptorRenovacao(instancia: AxiosInstance) {
  let promessaRenovacao: Promise<string> | null = null;

  async function renovar(): Promise<string> {
    const { accessToken } = await renovarSessao(instancia.defaults.baseURL ?? '');
    armazenamentoToken.definir(accessToken);
    return accessToken;
  }

  return async function interceptorErro(erro: AxiosError): Promise<unknown> {
    const requisicaoOriginal = erro.config as RequisicaoComRetentativa | undefined;
    const rotaSemRenovacao = ROTAS_SEM_RENOVACAO.some((rota) =>
      requisicaoOriginal?.url?.includes(rota),
    );

    const naoRenovavel =
      erro.response?.status !== 401 ||
      !requisicaoOriginal ||
      requisicaoOriginal._jaTentouRenovar === true ||
      rotaSemRenovacao;
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
      notificarSessaoExpirada();
      return Promise.reject(normalizarErro(erro));
    }
  };
}

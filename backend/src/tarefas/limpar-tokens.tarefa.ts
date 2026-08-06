import { TokenRenovacaoRepositorio } from '@/repositorios/token-renovacao.repositorio';
import { executarTarefa } from '@/tarefas/executor';

/** Roda diariamente as 03:00, removendo refresh tokens expirados. Funcao
 * pura (repositorio injetavel) — testavel chamando direto, sem o
 * agendador. */
export async function limparTokens(
  repositorio: TokenRenovacaoRepositorio = new TokenRenovacaoRepositorio(),
): Promise<number> {
  return executarTarefa('limpar-tokens', () => repositorio.removerExpirados(new Date()));
}

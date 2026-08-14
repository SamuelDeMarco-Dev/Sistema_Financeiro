import { ConviteRepositorio } from '@/repositorios/convite.repositorio';
import { TokenRenovacaoRepositorio } from '@/repositorios/token-renovacao.repositorio';
import { executarTarefa } from '@/tarefas/executor';

/** Roda diariamente as 03:00: remove refresh tokens expirados e marca
 * convites de conta compartilhada vencidos como EXPIRADO (RN-35, issue
 * #70) — mesma tarefa, dois efeitos, ambos "coisas que passaram da
 * validade". Funcoes puras (repositorios injetaveis) — testaveis chamando
 * direto, sem o agendador. */
export async function limparTokens(
  tokenRepositorio: TokenRenovacaoRepositorio = new TokenRenovacaoRepositorio(),
  conviteRepositorio: ConviteRepositorio = new ConviteRepositorio(),
): Promise<number> {
  return executarTarefa('limpar-tokens', async () => {
    const agora = new Date();
    const [tokensRemovidos, convitesExpirados] = await Promise.all([
      tokenRepositorio.removerExpirados(agora),
      conviteRepositorio.marcarExpirados(agora),
    ]);
    return tokensRemovidos + convitesExpirados;
  });
}

import { MovimentacaoRepositorio } from '@/repositorios/movimentacao.repositorio';
import { executarTarefa } from '@/tarefas/executor';
import { hojeUtc } from '@/utilitarios/data';

/** RN-18: roda diariamente as 00:15, reabastecendo ocorrencias de
 * recorrencia ate 12 meses a frente de hoje. Funcao pura (repositorio
 * injetavel) — testavel chamando direto, sem o agendador. */
export async function gerarRecorrencias(
  repositorio: MovimentacaoRepositorio = new MovimentacaoRepositorio(),
): Promise<number> {
  return executarTarefa('gerar-recorrencias', () => {
    const hoje = hojeUtc();
    const limiteData = new Date(
      Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 12, hoje.getUTCDate()),
    );
    return repositorio.gerarOcorrenciasFaltantes(limiteData);
  });
}

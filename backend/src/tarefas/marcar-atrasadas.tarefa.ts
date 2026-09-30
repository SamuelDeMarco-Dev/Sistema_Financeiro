import { MovimentacaoRepositorio } from '@/repositorios/movimentacao.repositorio';
import { executarTarefa } from '@/tarefas/executor';
import { hojeUtc } from '@/utilitarios/data';

/** RF-30: roda diariamente as 00:05. Funcao pura (repositorio injetavel)
 * — testavel chamando direto, sem o agendador. */
export async function marcarAtrasadas(
  repositorio: MovimentacaoRepositorio = new MovimentacaoRepositorio(),
): Promise<number> {
  return executarTarefa('marcar-atrasadas', () => repositorio.marcarAtrasadas(hojeUtc()));
}

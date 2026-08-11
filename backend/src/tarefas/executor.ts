import { registrador } from '@/utilitarios/registrador';

/** Log de inicio/fim/duracao/contagem e contencao de excecao — comuns as
 * tarefas diarias (issue #41): "toda tarefa loga inicio, fim, duracao e
 * contagem de registros afetados" e "toda tarefa captura excecao sem
 * derrubar o processo" valem para as tres, entao moram aqui em vez de
 * repetidas em cada `<nome>.tarefa.ts`. Em erro, devolve 0 (nao propaga)
 * — a tarefa seguinte do agendador nao pode ser impedida por esta. */
export async function executarTarefa(nome: string, fn: () => Promise<number>): Promise<number> {
  const inicio = Date.now();
  registrador.info({ tarefa: nome }, 'Tarefa iniciada.');

  try {
    const registrosAfetados = await fn();
    registrador.info(
      { tarefa: nome, registrosAfetados, duracaoMs: Date.now() - inicio },
      'Tarefa concluida.',
    );
    return registrosAfetados;
  } catch (erro) {
    registrador.error(
      { tarefa: nome, err: erro, duracaoMs: Date.now() - inicio },
      'Tarefa falhou.',
    );
    return 0;
  }
}

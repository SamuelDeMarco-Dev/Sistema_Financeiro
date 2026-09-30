import { describe, expect, it, vi } from 'vitest';
import { executarTarefa } from '@/tarefas/executor';

describe('tarefas/executor', () => {
  it('devolve o resultado da funcao quando ela executa com sucesso', async () => {
    const resultado = await executarTarefa('tarefa-teste', () => Promise.resolve(7));

    expect(resultado).toBe(7);
  });

  it('captura excecao da funcao e devolve 0, sem propagar (nao derruba o processo)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha simulada'));

    const resultado = await executarTarefa('tarefa-teste', fn);

    expect(resultado).toBe(0);
    expect(fn).toHaveBeenCalledOnce();
  });
});

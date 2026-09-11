import { afterEach, describe, expect, it, vi } from 'vitest';

const scheduleMock = vi.fn();

vi.mock('node-cron', () => ({ default: { schedule: scheduleMock } }));
vi.mock('@/tarefas/marcar-atrasadas.tarefa', () => ({ marcarAtrasadas: vi.fn() }));
vi.mock('@/tarefas/gerar-recorrencias.tarefa', () => ({ gerarRecorrencias: vi.fn() }));
vi.mock('@/tarefas/limpar-tokens.tarefa', () => ({ limparTokens: vi.fn() }));

describe('tarefas/agendador', () => {
  afterEach(() => {
    scheduleMock.mockClear();
    vi.doUnmock('@/configuracao/ambiente');
    vi.resetModules();
  });

  it('com HABILITAR_TAREFAS_AGENDADAS=false, nenhuma tarefa e registrada', async () => {
    vi.doMock('@/configuracao/ambiente', () => ({
      ambiente: { HABILITAR_TAREFAS_AGENDADAS: false, NODE_APP_INSTANCE: '0' },
    }));
    const { iniciarAgendador } = await import('@/tarefas/agendador');

    iniciarAgendador();

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('fora da instancia 0 do cluster, nenhuma tarefa e registrada', async () => {
    vi.doMock('@/configuracao/ambiente', () => ({
      ambiente: { HABILITAR_TAREFAS_AGENDADAS: true, NODE_APP_INSTANCE: '1' },
    }));
    const { iniciarAgendador } = await import('@/tarefas/agendador');

    iniciarAgendador();

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('habilitado na instancia 0, registra as tres tarefas diarias', async () => {
    vi.doMock('@/configuracao/ambiente', () => ({
      ambiente: { HABILITAR_TAREFAS_AGENDADAS: true, NODE_APP_INSTANCE: '0' },
    }));
    const { iniciarAgendador } = await import('@/tarefas/agendador');

    iniciarAgendador();

    expect(scheduleMock).toHaveBeenCalledTimes(3);
  });
});

import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as saudeServico from '@/servicos/saude.servico';
import { criarServidor } from '@/servidor';
import { registrador } from '@/utilitarios/registrador';

vi.mock('@/servicos/saude.servico', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/servicos/saude.servico')>();
  return { ...real, obterStatusLiveness: vi.fn(), obterStatusProntidao: vi.fn() };
});

const servicoMockado = vi.mocked(saudeServico);

describe('GET /api/v1/saude e /api/v1/saude/prontidao', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /saude responde 200 com o envelope de sucesso padrao', async () => {
    servicoMockado.obterStatusLiveness.mockReturnValue({
      status: 'ok',
      versao: '1.0.0',
      ambiente: 'test',
      tempoAtivoSegundos: 42,
    });

    const resposta = await request(criarServidor()).get('/api/v1/saude');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      success: true,
      data: { status: 'ok', versao: '1.0.0', ambiente: 'test', tempoAtivoSegundos: 42 },
    });
  });

  it('GET /saude/prontidao responde 200 quando o servico reporta "pronto"', async () => {
    servicoMockado.obterStatusProntidao.mockResolvedValue({
      status: 'pronto',
      verificacoes: {
        banco: { status: 'ok', latenciaMs: 3 },
        migrations: { status: 'ok', pendentes: 0 },
        armazenamento: { status: 'ok', gravavel: true },
      },
    });

    const resposta = await request(criarServidor()).get('/api/v1/saude/prontidao');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ success: true, data: { status: 'pronto' } });
  });

  it('GET /saude/prontidao responde 503 SERVICO_INDISPONIVEL quando o banco esta fora do ar', async () => {
    servicoMockado.obterStatusProntidao.mockResolvedValue({
      status: 'indisponivel',
      verificacoes: {
        banco: { status: 'erro', mensagem: 'Conexao recusada.' },
        migrations: { status: 'ok', pendentes: 0 },
        armazenamento: { status: 'ok', gravavel: true },
      },
    });

    const resposta = await request(criarServidor()).get('/api/v1/saude/prontidao');

    expect(resposta.status).toBe(503);
    expect(resposta.body).toMatchObject({
      success: false,
      codigo: 'SERVICO_INDISPONIVEL',
      data: { status: 'indisponivel', verificacoes: { banco: { status: 'erro' } } },
    });
  });

  it('ecoa o X-Request-Id enviado pelo cliente', async () => {
    servicoMockado.obterStatusLiveness.mockReturnValue({
      status: 'ok',
      versao: '1.0.0',
      ambiente: 'test',
      tempoAtivoSegundos: 1,
    });

    const resposta = await request(criarServidor())
      .get('/api/v1/saude')
      .set('X-Request-Id', 'id-fixo-do-cliente');

    expect(resposta.headers['x-request-id']).toBe('id-fixo-do-cliente');
  });

  it('gera um X-Request-Id quando o cliente nao envia nenhum', async () => {
    servicoMockado.obterStatusLiveness.mockReturnValue({
      status: 'ok',
      versao: '1.0.0',
      ambiente: 'test',
      tempoAtivoSegundos: 1,
    });

    const resposta = await request(criarServidor()).get('/api/v1/saude');

    expect(resposta.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('gera exatamente um registro de log por requisicao, com metodo/rota/status corretos', async () => {
    // O requestId em si (injetado pelo mixin do Pino a partir do
    // AsyncLocalStorage) e verificado separadamente em registrador.spec.ts
    // e correlacao.middleware.spec.ts — espionar `.info()` aqui substitui a
    // implementacao real, entao o mixin (que so roda na serializacao
    // interna do Pino) nunca chega a executar.
    servicoMockado.obterStatusLiveness.mockReturnValue({
      status: 'ok',
      versao: '1.0.0',
      ambiente: 'test',
      tempoAtivoSegundos: 1,
    });

    const espiao = vi.spyOn(registrador, 'info').mockImplementation(() => registrador);
    await request(criarServidor()).get('/api/v1/saude');

    expect(espiao).toHaveBeenCalledOnce();
    const [dados] = espiao.mock.calls[0] as [Record<string, unknown>];
    expect(dados).toMatchObject({ metodo: 'GET', rota: '/api/v1/saude', status: 200 });

    espiao.mockRestore();
  });
});

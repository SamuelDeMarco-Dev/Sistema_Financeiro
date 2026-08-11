import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ambiente } from '@/configuracao/ambiente';
import { reiniciarMetricas } from '@/observabilidade/metricas';
import { criarServidor } from '@/servidor';

describe('GET /metricas', () => {
  const tokenOriginal = ambiente.TOKEN_METRICAS;

  beforeEach(() => {
    ambiente.TOKEN_METRICAS = 'token-de-teste-com-32-caracteres';
    reiniciarMetricas();
  });

  afterEach(() => {
    ambiente.TOKEN_METRICAS = tokenOriginal;
  });

  it('responde 401 sem o cabecalho Authorization', async () => {
    const resposta = await request(criarServidor()).get('/metricas');

    expect(resposta.status).toBe(401);
  });

  it('responde 401 com um token incorreto', async () => {
    const resposta = await request(criarServidor())
      .get('/metricas')
      .set('Authorization', 'Bearer token-errado');

    expect(resposta.status).toBe(401);
  });

  it('responde 200 com o token correto e reflete o trafego real', async () => {
    const app = criarServidor();

    // Duas chamadas antes de ler as metricas — a leitura em si acontece
    // dentro do handler, antes do proprio "finish" desta requisicao, entao
    // nao se conta.
    await request(app).get('/api/v1/saude');
    await request(app).get('/api/v1/saude');

    const resposta = await request(app)
      .get('/metricas')
      .set('Authorization', 'Bearer token-de-teste-com-32-caracteres');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      success: true,
      data: {
        totalRequisicoes: 2,
        totalErros: 0,
        taxaErro: 0,
        latenciaMs: { p50: expect.any(Number) as number },
      },
    });
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { obterMetricas, registrarRequisicao, reiniciarMetricas } from '@/observabilidade/metricas';

describe('observabilidade/metricas', () => {
  beforeEach(() => {
    reiniciarMetricas();
  });

  it('comeca zerado', () => {
    const metricas = obterMetricas();

    expect(metricas.totalRequisicoes).toBe(0);
    expect(metricas.totalErros).toBe(0);
    expect(metricas.taxaErro).toBe(0);
    expect(metricas.latenciaMs).toEqual({ p50: 0, p95: 0, p99: 0 });
  });

  it('conta requisicoes e distingue erros (status >= 500) de sucesso', () => {
    registrarRequisicao(10, 200);
    registrarRequisicao(20, 404);
    registrarRequisicao(30, 500);

    const metricas = obterMetricas();

    expect(metricas.totalRequisicoes).toBe(3);
    expect(metricas.totalErros).toBe(1); // só o 500 — 404 é erro do cliente, nao do servidor
    expect(metricas.taxaErro).toBeCloseTo(1 / 3, 4);
  });

  it('calcula percentis de latencia a partir das amostras', () => {
    for (let i = 1; i <= 100; i++) {
      registrarRequisicao(i, 200);
    }

    const { latenciaMs } = obterMetricas();

    expect(latenciaMs.p50).toBe(50);
    expect(latenciaMs.p95).toBe(95);
    expect(latenciaMs.p99).toBe(99);
  });

  it('reiniciarMetricas zera o coletor', () => {
    registrarRequisicao(10, 200);
    reiniciarMetricas();

    expect(obterMetricas().totalRequisicoes).toBe(0);
  });
});

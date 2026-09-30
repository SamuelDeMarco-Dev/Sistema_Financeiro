import { describe, expect, it } from 'vitest';
import { paraDataIso } from '@/utilitarios/data';
import { periodoAnterior, primeiroEUltimoDiaDoMes, ultimosMeses } from '@/utilitarios/periodo';

describe('primeiroEUltimoDiaDoMes', () => {
  it('devolve o primeiro e o ultimo dia de um mes de 31 dias', () => {
    const periodo = primeiroEUltimoDiaDoMes(new Date(Date.UTC(2026, 6, 15)));
    expect(paraDataIso(periodo.dataInicio)).toBe('2026-07-01');
    expect(paraDataIso(periodo.dataFim)).toBe('2026-07-31');
  });

  it('devolve o ultimo dia correto de fevereiro em ano bissexto', () => {
    const periodo = primeiroEUltimoDiaDoMes(new Date(Date.UTC(2028, 1, 10)));
    expect(paraDataIso(periodo.dataFim)).toBe('2028-02-29');
  });

  it('devolve o ultimo dia correto de fevereiro em ano nao bissexto', () => {
    const periodo = primeiroEUltimoDiaDoMes(new Date(Date.UTC(2026, 1, 10)));
    expect(paraDataIso(periodo.dataFim)).toBe('2026-02-28');
  });
});

describe('periodoAnterior', () => {
  it('devolve o periodo imediatamente anterior com a mesma duracao (31 dias, cruzando maio/junho)', () => {
    const anterior = periodoAnterior({
      dataInicio: new Date(Date.UTC(2026, 6, 1)),
      dataFim: new Date(Date.UTC(2026, 6, 31)),
    });
    // Julho tem 31 dias; os 31 dias imediatamente anteriores a 01/07
    // terminam em 30/06 e comecam em 31/05 (nao "todo junho", que so tem
    // 30 dias) — duracao igual, nao "mes anterior".
    expect(paraDataIso(anterior.dataInicio)).toBe('2026-05-31');
    expect(paraDataIso(anterior.dataFim)).toBe('2026-06-30');
  });

  it('mantem a mesma duracao mesmo cruzando fevereiro (nao "o mes anterior")', () => {
    // Marco de 2026 tem 31 dias; o periodo anterior de MESMA DURACAO recua
    // 31 dias a partir de 28/02, nao "todo fevereiro" (28 dias).
    const anterior = periodoAnterior({
      dataInicio: new Date(Date.UTC(2026, 2, 1)),
      dataFim: new Date(Date.UTC(2026, 2, 31)),
    });
    expect(paraDataIso(anterior.dataFim)).toBe('2026-02-28');
    expect(paraDataIso(anterior.dataInicio)).toBe('2026-01-29');
  });

  it('funciona para um periodo de um unico dia', () => {
    const anterior = periodoAnterior({
      dataInicio: new Date(Date.UTC(2026, 6, 15)),
      dataFim: new Date(Date.UTC(2026, 6, 15)),
    });
    expect(paraDataIso(anterior.dataInicio)).toBe('2026-07-14');
    expect(paraDataIso(anterior.dataFim)).toBe('2026-07-14');
  });
});

describe('ultimosMeses', () => {
  it('devolve 12 meses terminando no mes de referencia, cruzando o ano anterior', () => {
    const periodo = ultimosMeses(12, new Date(Date.UTC(2026, 6, 15)));
    expect(paraDataIso(periodo.dataInicio)).toBe('2025-08-01');
    expect(paraDataIso(periodo.dataFim)).toBe('2026-07-31');
  });

  it('devolve 1 mes: so o mes de referencia', () => {
    const periodo = ultimosMeses(1, new Date(Date.UTC(2026, 6, 15)));
    expect(paraDataIso(periodo.dataInicio)).toBe('2026-07-01');
    expect(paraDataIso(periodo.dataFim)).toBe('2026-07-31');
  });
});

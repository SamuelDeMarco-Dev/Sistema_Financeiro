import os from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { urlComPoolDimensionado } from '@/banco/cliente';

describe('urlComPoolDimensionado', () => {
  it('adiciona connection_limit preservando os demais parametros da URL', () => {
    vi.spyOn(os, 'cpus').mockReturnValue(Array(8).fill({}) as os.CpuInfo[]);

    const url = urlComPoolDimensionado('postgresql://pfm:senha@host:5432/pfm?schema=public');
    const analisada = new URL(url);

    expect(analisada.searchParams.get('schema')).toBe('public');
    // (100 - 20 reservadas) / 8 nucleos = 10 por instancia
    expect(analisada.searchParams.get('connection_limit')).toBe('10');

    vi.restoreAllMocks();
  });

  it('nunca fica abaixo do minimo de 2 conexoes, mesmo com muitos nucleos', () => {
    vi.spyOn(os, 'cpus').mockReturnValue(Array(64).fill({}) as os.CpuInfo[]);

    const url = urlComPoolDimensionado('postgresql://pfm:senha@host:5432/pfm');
    const analisada = new URL(url);

    expect(analisada.searchParams.get('connection_limit')).toBe('2');

    vi.restoreAllMocks();
  });

  it('mantem o total (instancias x pool) dentro do orcamento do Postgres para 1 nucleo', () => {
    vi.spyOn(os, 'cpus').mockReturnValue([{}] as os.CpuInfo[]);

    const url = urlComPoolDimensionado('postgresql://pfm:senha@host:5432/pfm');
    const analisada = new URL(url);

    // 1 instancia: recebe o orcamento inteiro (100 - 20 reservadas)
    expect(analisada.searchParams.get('connection_limit')).toBe('80');

    vi.restoreAllMocks();
  });
});

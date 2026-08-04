import { describe, expect, it } from 'vitest';
import {
  obterOpcoesDiaSemana,
  obterOpcoesFormatoData,
  obterOpcoesMoeda,
  obterOpcoesTimezone,
} from './opcoes-preferencias';

describe('obterOpcoesFormatoData', () => {
  it('inclui o formato padrao do backend (dd/MM/yyyy)', () => {
    const opcoes = obterOpcoesFormatoData();
    expect(opcoes.some((opcao) => opcao.valor === 'dd/MM/yyyy')).toBe(true);
  });
});

describe('obterOpcoesDiaSemana', () => {
  it('gera 7 opcoes, 0 a 6, comecando em Domingo (padrao do backend)', () => {
    const opcoes = obterOpcoesDiaSemana();
    expect(opcoes).toHaveLength(7);
    expect(opcoes[0]).toEqual({ valor: '0', rotulo: 'Domingo' });
    expect(opcoes[6]?.valor).toBe('6');
  });
});

describe('obterOpcoesTimezone', () => {
  it('inclui fusos IANA validos, incluindo o padrao do backend', () => {
    const opcoes = obterOpcoesTimezone();
    expect(opcoes.some((opcao) => opcao.valor === 'America/Sao_Paulo')).toBe(true);
    expect(opcoes.length).toBeGreaterThan(100);
  });
});

describe('obterOpcoesMoeda', () => {
  it('inclui BRL com nome legivel e vem ordenado por codigo', () => {
    const opcoes = obterOpcoesMoeda();
    const brl = opcoes.find((opcao) => opcao.valor === 'BRL');
    expect(brl?.rotulo).toContain('BRL');
    expect(brl?.rotulo.length).toBeGreaterThan(3);

    const codigos = opcoes.map((opcao) => opcao.valor);
    expect(codigos).toEqual([...codigos].sort());
  });
});

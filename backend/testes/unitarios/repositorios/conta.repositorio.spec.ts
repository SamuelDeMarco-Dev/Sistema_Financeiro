import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';

const repositorio = new ContaRepositorio();

describe('ContaRepositorio', () => {
  describe('calcularSaldoAtual', () => {
    it('retorna o saldo inicial (M2: sem Movimentacao ate M3)', () => {
      const saldo = repositorio.calcularSaldoAtual({ saldoInicial: new Prisma.Decimal('150.00') });

      expect(saldo.toFixed(2)).toBe('150.00');
    });

    it('aceita saldo inicial negativo (cheque especial)', () => {
      const saldo = repositorio.calcularSaldoAtual({ saldoInicial: new Prisma.Decimal('-50.00') });

      expect(saldo.toFixed(2)).toBe('-50.00');
    });
  });

  describe('calcularSaldoPrevisto', () => {
    it('coincide com o saldo atual (sem pendentes ate M3)', () => {
      const conta = { saldoInicial: new Prisma.Decimal('3500.00') };

      expect(repositorio.calcularSaldoPrevisto(conta).toFixed(2)).toBe(
        repositorio.calcularSaldoAtual(conta).toFixed(2),
      );
    });
  });

  describe('calcularSaldoConsolidado', () => {
    it('soma apenas contas incluidas no total, nao arquivadas e nao excluidas', () => {
      const consolidado = repositorio.calcularSaldoConsolidado([
        {
          saldoInicial: new Prisma.Decimal('1000.00'),
          incluirNoSaldoTotal: true,
          arquivadaEm: null,
          excluidoEm: null,
        },
        {
          saldoInicial: new Prisma.Decimal('8000.00'),
          incluirNoSaldoTotal: false,
          arquivadaEm: null,
          excluidoEm: null,
        },
        {
          saldoInicial: new Prisma.Decimal('500.00'),
          incluirNoSaldoTotal: true,
          arquivadaEm: new Date(),
          excluidoEm: null,
        },
        {
          saldoInicial: new Prisma.Decimal('200.00'),
          incluirNoSaldoTotal: true,
          arquivadaEm: null,
          excluidoEm: new Date(),
        },
      ]);

      expect(consolidado.toFixed(2)).toBe('1000.00');
    });

    it('retorna zero para lista vazia', () => {
      expect(repositorio.calcularSaldoConsolidado([]).toFixed(2)).toBe('0.00');
    });
  });
});

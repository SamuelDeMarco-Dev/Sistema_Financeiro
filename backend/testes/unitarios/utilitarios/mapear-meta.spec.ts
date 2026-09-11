import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { mapearMeta } from '@/utilitarios/mapear-meta';
import type { Meta } from '@prisma/client';

function fabricarMeta(sobrescritas: Partial<Meta> = {}): Meta {
  return {
    id: 'meta-1',
    usuarioId: 'usuario-1',
    contaCompartilhadaId: null,
    nome: 'Viagem Chile',
    descricao: null,
    valorAlvo: new Prisma.Decimal('1000.00'),
    valorAcumulado: new Prisma.Decimal('0.00'),
    prazoEm: null,
    cor: '#16A34A',
    icone: 'target',
    situacao: 'ATIVA',
    concluidaEm: null,
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    excluidoEm: null,
    ...sobrescritas,
  };
}

const HOJE = new Date('2026-06-15T00:00:00.000Z');

describe('mapearMeta', () => {
  describe('percentualProgresso (RN-46)', () => {
    it('e 0 quando nada foi acumulado', () => {
      const dto = mapearMeta(fabricarMeta({ valorAcumulado: new Prisma.Decimal('0') }), HOJE);
      expect(dto.percentualProgresso).toBe(0);
    });

    it('e 50 na metade do alvo', () => {
      const dto = mapearMeta(fabricarMeta({ valorAcumulado: new Prisma.Decimal('500') }), HOJE);
      expect(dto.percentualProgresso).toBe(50);
    });

    it('e 100 exatamente no alvo', () => {
      const dto = mapearMeta(fabricarMeta({ valorAcumulado: new Prisma.Decimal('1000') }), HOJE);
      expect(dto.percentualProgresso).toBe(100);
    });

    it('fica limitado a 100 quando o acumulado supera o alvo', () => {
      const dto = mapearMeta(fabricarMeta({ valorAcumulado: new Prisma.Decimal('1500') }), HOJE);
      expect(dto.percentualProgresso).toBe(100);
    });
  });

  describe('valorRestante', () => {
    it('nunca fica negativo quando o acumulado supera o alvo', () => {
      const dto = mapearMeta(fabricarMeta({ valorAcumulado: new Prisma.Decimal('1500') }), HOJE);
      expect(dto.valorRestante).toBe('0.00');
    });

    it('e a diferenca exata quando ha saldo a acumular', () => {
      const dto = mapearMeta(fabricarMeta({ valorAcumulado: new Prisma.Decimal('300') }), HOJE);
      expect(dto.valorRestante).toBe('700.00');
    });
  });

  describe('sem prazoEm', () => {
    it('diasRestantes e aporteMensalNecessario sao null', () => {
      const dto = mapearMeta(fabricarMeta({ prazoEm: null }), HOJE);
      expect(dto.diasRestantes).toBeNull();
      expect(dto.aporteMensalNecessario).toBeNull();
    });
  });

  describe('aporteMensalNecessario (RF-63)', () => {
    it('divide pelo numero de meses inteiros restantes, arredondado para cima', () => {
      // HOJE = 2026-06-15, prazo = 2026-09-01 -> 3 meses de diferenca de calendario.
      const dto = mapearMeta(
        fabricarMeta({
          valorAcumulado: new Prisma.Decimal('100'),
          prazoEm: new Date('2026-09-01T00:00:00.000Z'),
        }),
        HOJE,
      );
      // valorRestante = 900.00 / 3 meses = 300.00 exato.
      expect(dto.aporteMensalNecessario).toBe('300.00');
    });

    it('nao produz Infinity quando o prazo cai no mesmo mes corrente', () => {
      const dto = mapearMeta(
        fabricarMeta({
          valorAcumulado: new Prisma.Decimal('0'),
          prazoEm: new Date('2026-06-30T00:00:00.000Z'),
        }),
        HOJE,
      );
      // diffMeses de calendario = 0 -> piso de 1 mes, nunca divide por zero.
      expect(dto.aporteMensalNecessario).toBe('1000.00');
      expect(dto.aporteMensalNecessario).not.toBe('Infinity');
    });

    it('arredonda para cima quando a divisao nao e exata', () => {
      const dto = mapearMeta(
        fabricarMeta({
          valorAcumulado: new Prisma.Decimal('0'),
          prazoEm: new Date('2026-09-01T00:00:00.000Z'),
        }),
        HOJE,
      );
      // 1000.00 / 3 = 333.333... -> arredonda para cima.
      expect(dto.aporteMensalNecessario).toBe('333.34');
    });
  });

  describe('diasRestantes', () => {
    it('conta os dias entre hoje e o prazo', () => {
      const dto = mapearMeta(fabricarMeta({ prazoEm: new Date('2026-06-25T00:00:00.000Z') }), HOJE);
      expect(dto.diasRestantes).toBe(10);
    });

    it('e negativo quando o prazo ja passou', () => {
      const dto = mapearMeta(fabricarMeta({ prazoEm: new Date('2026-06-01T00:00:00.000Z') }), HOJE);
      expect(dto.diasRestantes).toBe(-14);
    });
  });
});

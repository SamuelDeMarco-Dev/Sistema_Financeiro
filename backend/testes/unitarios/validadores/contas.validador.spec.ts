import { describe, expect, it } from 'vitest';
import {
  atualizarContaSchema,
  criarContaSchema,
  listarContasSchema,
  reordenarContasSchema,
} from '@/validadores/contas.validador';

describe('validadores/contas', () => {
  describe('criarContaSchema', () => {
    function corpoValido(sobrescritas: Record<string, unknown> = {}): unknown {
      return { body: { nome: 'Banco Principal', tipo: 'CONTA_CORRENTE', ...sobrescritas } };
    }

    it('aceita o corpo minimo e aplica os padroes', () => {
      const resultado = criarContaSchema.parse(corpoValido());

      expect(resultado.body).toMatchObject({
        nome: 'Banco Principal',
        tipo: 'CONTA_CORRENTE',
        saldoInicial: '0.00',
        cor: '#2563EB',
        icone: 'wallet',
        incluirNoSaldoTotal: true,
      });
    });

    it('rejeita nome com menos de 2 caracteres', () => {
      expect(() => criarContaSchema.parse(corpoValido({ nome: 'A' }))).toThrow();
    });

    it('rejeita tipo fora do enum', () => {
      expect(() => criarContaSchema.parse(corpoValido({ tipo: 'CRIPTO' }))).toThrow();
    });

    it('aceita saldoInicial negativo (cheque especial)', () => {
      const resultado = criarContaSchema.parse(corpoValido({ saldoInicial: '-150.00' }));
      expect(resultado.body.saldoInicial).toBe('-150.00');
    });

    it('rejeita saldoInicial com mais de duas casas decimais', () => {
      expect(() => criarContaSchema.parse(corpoValido({ saldoInicial: '10.999' }))).toThrow();
    });

    it('rejeita cor fora do formato hex', () => {
      expect(() => criarContaSchema.parse(corpoValido({ cor: 'azul' }))).toThrow();
    });

    it('rejeita contaCompartilhadaId nao nulo (grupo chega em M6)', () => {
      expect(() =>
        criarContaSchema.parse(corpoValido({ contaCompartilhadaId: 'grupo-1' })),
      ).toThrow();
    });

    it('aceita contaCompartilhadaId ausente ou nulo', () => {
      expect(() =>
        criarContaSchema.parse(corpoValido({ contaCompartilhadaId: null })),
      ).not.toThrow();
    });
  });

  describe('atualizarContaSchema', () => {
    it('aceita corpo parcial com apenas um campo', () => {
      const resultado = atualizarContaSchema.parse({
        params: { id: 'conta-1' },
        body: { nome: 'Novo nome' },
      });
      expect(resultado.body).toEqual({ nome: 'Novo nome' });
    });

    it('aceita corpo vazio', () => {
      expect(() =>
        atualizarContaSchema.parse({ params: { id: 'conta-1' }, body: {} }),
      ).not.toThrow();
    });

    it('rejeita id vazio nos params', () => {
      expect(() => atualizarContaSchema.parse({ params: { id: '' }, body: {} })).toThrow();
    });
  });

  describe('listarContasSchema', () => {
    it('aplica os padroes quando a query esta vazia', () => {
      const resultado = listarContasSchema.parse({ query: {} });

      expect(resultado.query).toMatchObject({
        incluirArquivadas: false,
        ordenarPor: 'ordem',
        ordem: 'asc',
      });
    });

    it('normaliza tipo unico em array', () => {
      const resultado = listarContasSchema.parse({ query: { tipo: 'CARTEIRA' } });
      expect(resultado.query.tipo).toEqual(['CARTEIRA']);
    });

    it('mantem tipo repetido como array', () => {
      const resultado = listarContasSchema.parse({
        query: { tipo: ['CARTEIRA', 'POUPANCA'] },
      });
      expect(resultado.query.tipo).toEqual(['CARTEIRA', 'POUPANCA']);
    });

    it('converte incluirArquivadas de string para boolean', () => {
      const resultado = listarContasSchema.parse({ query: { incluirArquivadas: 'true' } });
      expect(resultado.query.incluirArquivadas).toBe(true);
    });

    it('rejeita ordenarPor fora da lista fechada', () => {
      expect(() => listarContasSchema.parse({ query: { ordenarPor: 'saldoInicial' } })).toThrow();
    });
  });

  describe('reordenarContasSchema', () => {
    it('aceita uma lista de ordens', () => {
      const resultado = reordenarContasSchema.parse({
        body: { ordens: [{ id: 'conta-1', ordem: 0 }] },
      });
      expect(resultado.body.ordens).toHaveLength(1);
    });

    it('rejeita lista vazia', () => {
      expect(() => reordenarContasSchema.parse({ body: { ordens: [] } })).toThrow();
    });

    it('rejeita ordem negativa', () => {
      expect(() =>
        reordenarContasSchema.parse({ body: { ordens: [{ id: 'conta-1', ordem: -1 }] } }),
      ).toThrow();
    });
  });
});

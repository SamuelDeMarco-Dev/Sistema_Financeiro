import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarMetaSchema,
  criarMetaSchema,
  listarMetasSchema,
} from '@/validadores/metas.validador';

describe('validadores/metas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('criarMetaSchema', () => {
    function corpoValido(sobrescritas: Record<string, unknown> = {}): unknown {
      return { body: { nome: 'Viagem Chile', valorAlvo: '1000.00', ...sobrescritas } };
    }

    it('aceita o corpo minimo e aplica os padroes', () => {
      const resultado = criarMetaSchema.parse(corpoValido());

      expect(resultado.body).toMatchObject({
        nome: 'Viagem Chile',
        valorAlvo: '1000.00',
        cor: '#16A34A',
        icone: 'target',
      });
    });

    it('rejeita valorAlvo zero', () => {
      expect(() => criarMetaSchema.parse(corpoValido({ valorAlvo: '0' }))).toThrow();
    });

    it('rejeita valorAlvo negativo', () => {
      expect(() => criarMetaSchema.parse(corpoValido({ valorAlvo: '-100' }))).toThrow();
    });

    it('rejeita nome com menos de 2 caracteres', () => {
      expect(() => criarMetaSchema.parse(corpoValido({ nome: 'A' }))).toThrow();
    });

    it('rejeita prazo no passado', () => {
      expect(() => criarMetaSchema.parse(corpoValido({ prazoEm: '2026-06-14' }))).toThrow();
    });

    it('aceita prazo igual a hoje', () => {
      const resultado = criarMetaSchema.parse(corpoValido({ prazoEm: '2026-06-15' }));
      expect(resultado.body.prazoEm).toBe('2026-06-15');
    });

    it('aceita prazo no futuro', () => {
      const resultado = criarMetaSchema.parse(corpoValido({ prazoEm: '2027-01-01' }));
      expect(resultado.body.prazoEm).toBe('2027-01-01');
    });

    it('rejeita cor fora do formato hex', () => {
      expect(() => criarMetaSchema.parse(corpoValido({ cor: 'verde' }))).toThrow();
    });

    it('aceita contaCompartilhadaId para criar meta de grupo', () => {
      const resultado = criarMetaSchema.parse(corpoValido({ contaCompartilhadaId: 'grupo-1' }));
      expect(resultado.body.contaCompartilhadaId).toBe('grupo-1');
    });
  });

  describe('atualizarMetaSchema', () => {
    it('aceita corpo parcial', () => {
      const resultado = atualizarMetaSchema.parse({
        params: { id: 'meta-1' },
        body: { nome: 'Novo nome' },
      });
      expect(resultado.body).toEqual({ nome: 'Novo nome' });
    });

    it('aceita prazoEm null para remover o prazo', () => {
      const resultado = atualizarMetaSchema.parse({
        params: { id: 'meta-1' },
        body: { prazoEm: null },
      });
      expect(resultado.body.prazoEm).toBeNull();
    });

    it('rejeita prazoEm no passado', () => {
      expect(() =>
        atualizarMetaSchema.parse({ params: { id: 'meta-1' }, body: { prazoEm: '2020-01-01' } }),
      ).toThrow();
    });
  });

  describe('listarMetasSchema', () => {
    it('usa ATIVA como padrao quando situacao nao e informada', () => {
      const resultado = listarMetasSchema.parse({ query: {} });
      expect(resultado.query.situacao).toEqual(['ATIVA']);
    });

    it('normaliza um unico valor repetido em array', () => {
      const resultado = listarMetasSchema.parse({ query: { situacao: 'CONCLUIDA' } });
      expect(resultado.query.situacao).toEqual(['CONCLUIDA']);
    });

    it('aceita multiplos valores de situacao', () => {
      const resultado = listarMetasSchema.parse({
        query: { situacao: ['ATIVA', 'PAUSADA'] },
      });
      expect(resultado.query.situacao).toEqual(['ATIVA', 'PAUSADA']);
    });
  });
});

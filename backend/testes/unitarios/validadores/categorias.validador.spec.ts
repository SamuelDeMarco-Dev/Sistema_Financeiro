import { describe, expect, it } from 'vitest';
import {
  atualizarCategoriaSchema,
  criarCategoriaSchema,
  excluirCategoriaSchema,
  listarCategoriasSchema,
} from '@/validadores/categorias.validador';

describe('validadores/categorias', () => {
  describe('criarCategoriaSchema', () => {
    function corpoValido(sobrescritas: Record<string, unknown> = {}): unknown {
      return { body: { nome: 'Academia', tipo: 'DESPESA', ...sobrescritas } };
    }

    it('aceita o corpo minimo e aplica os padroes', () => {
      const resultado = criarCategoriaSchema.parse(corpoValido());

      expect(resultado.body).toMatchObject({
        nome: 'Academia',
        tipo: 'DESPESA',
        cor: '#64748B',
        icone: 'tag',
        categoriaPaiId: null,
      });
    });

    it('rejeita nome com menos de 2 caracteres', () => {
      expect(() => criarCategoriaSchema.parse(corpoValido({ nome: 'A' }))).toThrow();
    });

    it('rejeita tipo fora do enum', () => {
      expect(() => criarCategoriaSchema.parse(corpoValido({ tipo: 'TRANSFERENCIA' }))).toThrow();
    });

    it('aceita categoriaPaiId como string', () => {
      const resultado = criarCategoriaSchema.parse(corpoValido({ categoriaPaiId: 'pai-1' }));
      expect(resultado.body.categoriaPaiId).toBe('pai-1');
    });

    it('aceita contaCompartilhadaId nao nulo (issue #72: cria categoria de grupo)', () => {
      const resultado = criarCategoriaSchema.parse(
        corpoValido({ contaCompartilhadaId: 'grupo-1' }),
      );
      expect(resultado.body.contaCompartilhadaId).toBe('grupo-1');
    });
  });

  describe('atualizarCategoriaSchema', () => {
    it('aceita corpo parcial', () => {
      const resultado = atualizarCategoriaSchema.parse({
        params: { id: 'categoria-1' },
        body: { nome: 'Novo nome' },
      });
      expect(resultado.body).toEqual({ nome: 'Novo nome' });
    });

    it('rejeita id vazio nos params', () => {
      expect(() => atualizarCategoriaSchema.parse({ params: { id: '' }, body: {} })).toThrow();
    });
  });

  describe('listarCategoriasSchema', () => {
    it('aplica os padroes quando a query esta vazia', () => {
      const resultado = listarCategoriasSchema.parse({ query: {} });
      expect(resultado.query).toMatchObject({ apenasRaiz: false });
    });

    it('converte apenasRaiz de string para boolean', () => {
      const resultado = listarCategoriasSchema.parse({ query: { apenasRaiz: 'true' } });
      expect(resultado.query.apenasRaiz).toBe(true);
    });

    it('aceita filtro por tipo', () => {
      const resultado = listarCategoriasSchema.parse({ query: { tipo: 'RECEITA' } });
      expect(resultado.query.tipo).toBe('RECEITA');
    });
  });

  describe('excluirCategoriaSchema', () => {
    it('aceita recategorizarPara opcional', () => {
      const resultado = excluirCategoriaSchema.parse({
        params: { id: 'categoria-1' },
        query: {},
      });
      expect(resultado.query.recategorizarPara).toBeUndefined();
    });

    it('aceita recategorizarPara informado', () => {
      const resultado = excluirCategoriaSchema.parse({
        params: { id: 'categoria-1' },
        query: { recategorizarPara: 'categoria-2' },
      });
      expect(resultado.query.recategorizarPara).toBe('categoria-2');
    });
  });
});

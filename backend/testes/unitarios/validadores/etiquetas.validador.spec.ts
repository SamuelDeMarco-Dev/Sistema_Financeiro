import { describe, expect, it } from 'vitest';
import { atualizarEtiquetaSchema, criarEtiquetaSchema } from '@/validadores/etiquetas.validador';

describe('validadores/etiquetas', () => {
  describe('criarEtiquetaSchema', () => {
    it('normaliza o nome para minusculas', () => {
      const resultado = criarEtiquetaSchema.parse({ body: { nome: 'Viagem' } });
      expect(resultado.body.nome).toBe('viagem');
    });

    it('remove espacos nas extremidades', () => {
      const resultado = criarEtiquetaSchema.parse({ body: { nome: '  viagem  ' } });
      expect(resultado.body.nome).toBe('viagem');
    });

    it('aplica a cor padrao quando ausente', () => {
      const resultado = criarEtiquetaSchema.parse({ body: { nome: 'viagem' } });
      expect(resultado.body.cor).toBe('#64748B');
    });

    it('rejeita nome vazio', () => {
      expect(() => criarEtiquetaSchema.parse({ body: { nome: '' } })).toThrow();
    });

    it('rejeita nome com mais de 40 caracteres', () => {
      expect(() => criarEtiquetaSchema.parse({ body: { nome: 'a'.repeat(41) } })).toThrow();
    });

    it('rejeita cor fora do formato hex', () => {
      expect(() => criarEtiquetaSchema.parse({ body: { nome: 'viagem', cor: 'azul' } })).toThrow();
    });

    it('rejeita contaCompartilhadaId nao nulo (grupo chega em M6)', () => {
      expect(() =>
        criarEtiquetaSchema.parse({ body: { nome: 'viagem', contaCompartilhadaId: 'grupo-1' } }),
      ).toThrow();
    });
  });

  describe('atualizarEtiquetaSchema', () => {
    it('aceita corpo parcial com apenas a cor', () => {
      const resultado = atualizarEtiquetaSchema.parse({
        params: { id: 'etiqueta-1' },
        body: { cor: '#0EA5E9' },
      });
      expect(resultado.body).toEqual({ cor: '#0EA5E9' });
    });

    it('normaliza o nome quando presente', () => {
      const resultado = atualizarEtiquetaSchema.parse({
        params: { id: 'etiqueta-1' },
        body: { nome: 'Praia' },
      });
      expect(resultado.body.nome).toBe('praia');
    });
  });
});

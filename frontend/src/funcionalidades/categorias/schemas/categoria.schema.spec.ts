import { describe, expect, it } from 'vitest';
import { categoriaSchema } from './categoria.schema';

function corpoValido(sobrescritas: Record<string, unknown> = {}): unknown {
  return {
    nome: 'Academia',
    tipo: 'DESPESA',
    cor: '#84CC16',
    icone: 'dumbbell',
    categoriaPaiId: null,
    ...sobrescritas,
  };
}

describe('categoria.schema', () => {
  it('aceita um corpo valido', () => {
    expect(() => categoriaSchema.parse(corpoValido())).not.toThrow();
  });

  it('rejeita nome com menos de 2 caracteres', () => {
    expect(() => categoriaSchema.parse(corpoValido({ nome: 'A' }))).toThrow();
  });

  it('rejeita tipo fora do enum', () => {
    expect(() => categoriaSchema.parse(corpoValido({ tipo: 'TRANSFERENCIA' }))).toThrow();
  });

  it('rejeita cor fora do formato hex', () => {
    expect(() => categoriaSchema.parse(corpoValido({ cor: 'verde' }))).toThrow();
  });

  it('aceita categoriaPaiId como string', () => {
    const resultado = categoriaSchema.parse(corpoValido({ categoriaPaiId: 'categoria-1' }));
    expect(resultado.categoriaPaiId).toBe('categoria-1');
  });
});

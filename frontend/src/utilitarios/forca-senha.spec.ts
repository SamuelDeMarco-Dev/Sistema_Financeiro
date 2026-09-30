import { describe, expect, it } from 'vitest';
import { calcularForcaSenha } from './forca-senha';

describe('calcularForcaSenha', () => {
  it('senha vazia e Fraca com pontuacao 0', () => {
    expect(calcularForcaSenha('')).toEqual({ pontuacao: 0, nivel: 'FRACA', rotulo: 'Fraca' });
  });

  it('senha curta e so minuscula e Fraca', () => {
    const resultado = calcularForcaSenha('abc');
    expect(resultado.nivel).toBe('FRACA');
  });

  it('senha com 8+ caracteres, maiuscula/minuscula e digito e Media', () => {
    const resultado = calcularForcaSenha('Senha123');
    expect(resultado.nivel).toBe('MEDIA');
  });

  it('senha com 8+ caracteres, caixa mista, digito e simbolo e Forte', () => {
    const resultado = calcularForcaSenha('Senha1@x');
    expect(resultado.nivel).toBe('FORTE');
  });

  it('senha longa (12+) com todos os criterios e Muito forte', () => {
    const resultado = calcularForcaSenha('SenhaForte@2026');
    expect(resultado.nivel).toBe('MUITO_FORTE');
    expect(resultado.pontuacao).toBe(5);
  });
});

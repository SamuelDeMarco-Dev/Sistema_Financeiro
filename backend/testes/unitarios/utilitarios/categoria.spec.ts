import { describe, expect, it } from 'vitest';
import { validarCompatibilidadeCategoria } from '@/utilitarios/categoria';

describe('utilitarios/categoria', () => {
  describe('validarCompatibilidadeCategoria', () => {
    it('categoria RECEITA e compativel apenas com movimentacao RECEITA', () => {
      expect(validarCompatibilidadeCategoria({ tipo: 'RECEITA' }, 'RECEITA')).toBe(true);
      expect(validarCompatibilidadeCategoria({ tipo: 'RECEITA' }, 'DESPESA')).toBe(false);
    });

    it('categoria DESPESA e compativel apenas com movimentacao DESPESA', () => {
      expect(validarCompatibilidadeCategoria({ tipo: 'DESPESA' }, 'DESPESA')).toBe(true);
      expect(validarCompatibilidadeCategoria({ tipo: 'DESPESA' }, 'RECEITA')).toBe(false);
    });

    it('categoria AMBOS e compativel com RECEITA e DESPESA', () => {
      expect(validarCompatibilidadeCategoria({ tipo: 'AMBOS' }, 'RECEITA')).toBe(true);
      expect(validarCompatibilidadeCategoria({ tipo: 'AMBOS' }, 'DESPESA')).toBe(true);
    });
  });
});

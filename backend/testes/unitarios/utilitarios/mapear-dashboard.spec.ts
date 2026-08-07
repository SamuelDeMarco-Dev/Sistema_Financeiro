import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { LinhaPorCategoria } from '@/repositorios/dashboard.repositorio';
import { SEM_CATEGORIA_ID, mapearPorCategoria } from '@/utilitarios/mapear-dashboard';

function linha(sobrescritas: Partial<LinhaPorCategoria> = {}): LinhaPorCategoria {
  return {
    categoria_id: 'cat-1',
    categoria_nome: 'Mercado',
    categoria_cor: '#F97316',
    categoria_icone: 'shopping-cart',
    total: new Prisma.Decimal('100.00'),
    quantidade: 1,
    ...sobrescritas,
  };
}

describe('mapearPorCategoria (issue #49)', () => {
  it('devolve array vazio quando nao ha linhas (periodo sem despesas)', () => {
    expect(mapearPorCategoria([])).toEqual([]);
  });

  it('categoria unica recebe 100% mesmo com total zero', () => {
    const itens = mapearPorCategoria([linha({ total: new Prisma.Decimal('0.00') })]);
    expect(itens[0]?.percentual).toBe(0);
  });

  it('categoria_id nulo e mapeado para "Sem categoria"', () => {
    const itens = mapearPorCategoria([
      linha({
        categoria_id: null,
        categoria_nome: null,
        categoria_cor: null,
        categoria_icone: null,
      }),
    ]);

    expect(itens[0]?.categoria).toEqual({
      id: SEM_CATEGORIA_ID,
      nome: 'Sem categoria',
      cor: '#64748B',
      icone: 'tag',
    });
  });

  it('a soma dos percentuais e SEMPRE exatamente 100, mesmo com arredondamento (1/3 cada)', () => {
    const itens = mapearPorCategoria([
      linha({ categoria_id: 'a', total: new Prisma.Decimal('100.00') }),
      linha({ categoria_id: 'b', total: new Prisma.Decimal('100.00') }),
      linha({ categoria_id: 'c', total: new Prisma.Decimal('100.00') }),
    ]);

    const soma = itens.reduce((acumulado, item) => acumulado + item.percentual, 0);
    expect(soma).toBe(100);
    // 100/300 = 33.33... arredonda para 33.33 nos dois primeiros; o
    // ultimo fica com o resto (33.34), nao 33.33 — e ele quem absorve o
    // erro de arredondamento, por isso a soma bate exatamente 100.
    expect(itens[0]?.percentual).toBe(33.33);
    expect(itens[1]?.percentual).toBe(33.33);
    expect(itens[2]?.percentual).toBe(33.34);
  });

  it('preserva total e quantidade originais de cada linha', () => {
    const itens = mapearPorCategoria([
      linha({ total: new Prisma.Decimal('250.50'), quantidade: 7 }),
    ]);

    expect(itens[0]?.total.toFixed(2)).toBe('250.50');
    expect(itens[0]?.quantidade).toBe(7);
  });
});

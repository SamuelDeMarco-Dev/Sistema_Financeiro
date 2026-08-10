import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraficoPizza } from './GraficoPizza';
import type { ItemGraficoPizza } from './GraficoPizza';

const ITENS: ItemGraficoPizza[] = [
  { categoria: { id: 'cat-1', nome: 'Mercado', cor: '#F97316' }, total: '764.30', percentual: 60 },
  {
    categoria: { id: 'cat-2', nome: 'Transporte', cor: '#2563EB' },
    total: '509.55',
    percentual: 40,
  },
];

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe('GraficoPizza', () => {
  it('mostra o estado vazio quando nao ha itens', () => {
    render(<GraficoPizza titulo="Despesas por categoria" itens={[]} />);

    expect(screen.getByText('Sem dados no período selecionado.')).toBeTruthy();
  });

  it('expoe role="img" com aria-label descrevendo a categoria com maior percentual', () => {
    render(<GraficoPizza titulo="Despesas por categoria" itens={ITENS} />);

    const descricao = screen.getByRole('img').getAttribute('aria-label');
    expect(descricao).toContain('Mercado');
    expect(descricao).toContain('60.0%');
  });

  it('a tabela equivalente lista todas as categorias', () => {
    render(<GraficoPizza titulo="Despesas por categoria" itens={ITENS} />);

    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.getByText('Transporte')).toBeTruthy();
  });
});

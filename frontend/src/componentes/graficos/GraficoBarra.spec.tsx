import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraficoBarra } from './GraficoBarra';
import type { ItemGraficoBarra } from './GraficoBarra';

const ITENS: ItemGraficoBarra[] = [
  { rotulo: 'Mercado', atual: '800.00', anterior: '600.00' },
  { rotulo: 'Transporte', atual: '200.00', anterior: '300.00' },
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

describe('GraficoBarra', () => {
  it('mostra o estado vazio quando nao ha itens', () => {
    render(<GraficoBarra titulo="Comparativo" itens={[]} />);

    expect(screen.getByText('Sem dados no período selecionado.')).toBeTruthy();
  });

  it('expoe role="img" com aria-label comparando os totais', () => {
    render(<GraficoBarra titulo="Comparativo" itens={ITENS} />);

    const descricao = screen.getByRole('img').getAttribute('aria-label');
    expect(descricao).toContain('Atual');
    expect(descricao).toContain('Anterior');
  });

  it('aceita rotulos customizados para os periodos', () => {
    render(
      <GraficoBarra
        titulo="Comparativo"
        itens={ITENS}
        rotuloAtual="Julho/2026"
        rotuloAnterior="Junho/2026"
      />,
    );

    const descricao = screen.getByRole('img').getAttribute('aria-label');
    expect(descricao).toContain('Julho/2026');
    expect(descricao).toContain('Junho/2026');
  });

  it('a tabela equivalente lista todas as categorias', () => {
    render(<GraficoBarra titulo="Comparativo" itens={ITENS} />);

    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.getByText('Transporte')).toBeTruthy();
  });
});

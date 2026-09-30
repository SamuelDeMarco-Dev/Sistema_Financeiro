import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraficoLinha } from './GraficoLinha';
import type { PontoGraficoLinha } from './GraficoLinha';

const PONTOS: PontoGraficoLinha[] = [
  { mes: '2026-01', rotulo: 'jan/26', receitas: '1000.00', despesas: '800.00' },
  { mes: '2026-02', rotulo: 'fev/26', receitas: '1200.00', despesas: '700.00' },
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

describe('GraficoLinha', () => {
  it('mostra o estado vazio quando nao ha pontos', () => {
    render(<GraficoLinha titulo="Fluxo de caixa" pontos={[]} />);

    expect(screen.getByText('Sem dados no período selecionado.')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('expoe role="img" com aria-label descrevendo a tendência', () => {
    render(<GraficoLinha titulo="Fluxo de caixa" pontos={PONTOS} />);

    const grafico = screen.getByRole('img');
    const descricao = grafico.getAttribute('aria-label');
    expect(descricao).toContain('jan/26');
    expect(descricao).toContain('fev/26');
    expect(descricao).toContain('melhorou');
  });

  it('a tabela equivalente contem todos os pontos da serie', () => {
    render(<GraficoLinha titulo="Fluxo de caixa" pontos={PONTOS} />);

    expect(screen.getByText('jan/26')).toBeTruthy();
    expect(screen.getByText('fev/26')).toBeTruthy();
  });

  it('o titulo aparece como cabecalho da secao', () => {
    render(<GraficoLinha titulo="Fluxo de caixa" pontos={PONTOS} />);

    expect(screen.getByRole('heading', { name: 'Fluxo de caixa' })).toBeTruthy();
  });
});

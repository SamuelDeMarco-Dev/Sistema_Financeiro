import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SecaoAlertas } from './SecaoAlertas';
import type { Alerta } from '../tipos/dashboard';

function renderizar(alertas: Alerta[]): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <SecaoAlertas alertas={alertas} />
    </MemoryRouter>,
  );
}

describe('SecaoAlertas', () => {
  it('nao renderiza nada quando nao ha alertas', () => {
    const { container } = renderizar([]);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza um link por alerta, apontando para urlAcao', () => {
    renderizar([
      {
        tipo: 'DESPESA_A_VENCER',
        severidade: 'INFORMACAO',
        titulo: '3 contas vencem nos próximos 7 dias',
        urlAcao: '/movimentacoes?situacao=PENDENTE',
      },
    ]);

    const link = screen.getByRole('link', { name: /3 contas vencem/ });
    expect(link.getAttribute('href')).toBe('/movimentacoes?situacao=PENDENTE');
  });
});

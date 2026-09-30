import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SecaoContasCompartilhadas } from './SecaoContasCompartilhadas';
import type { ContaCompartilhadaResumoDashboard } from '../tipos/dashboard';

function fabricarGrupo(
  sobrescritas: Partial<ContaCompartilhadaResumoDashboard> = {},
): ContaCompartilhadaResumoDashboard {
  return {
    id: 'grupo-1',
    nome: 'Casa',
    meuPapel: 'ADMINISTRADOR',
    saldoTotal: '1284.60',
    quantidadeMembros: 3,
    resumoMesAtual: { receitas: '3200.00', despesas: '1915.40' },
    ...sobrescritas,
  };
}

function renderizar(grupos: ContaCompartilhadaResumoDashboard[]): HTMLElement {
  const { container } = render(
    <MemoryRouter>
      <SecaoContasCompartilhadas grupos={grupos} />
    </MemoryRouter>,
  );
  return container;
}

describe('SecaoContasCompartilhadas', () => {
  it('some da tela inicial quando o usuario nao participa de nenhum grupo', () => {
    const container = renderizar([]);

    expect(container.textContent).toBe('');
  });

  it('mostra nome, saldo e papel de cada grupo', () => {
    renderizar([fabricarGrupo()]);

    expect(screen.getByText('Casa')).toBeTruthy();
    expect(screen.getByText(/1\.284,60/)).toBeTruthy();
    expect(screen.getByText('Administrador')).toBeTruthy();
  });

  it('cada grupo leva ao proprio detalhe e ha atalho para a lista', () => {
    renderizar([fabricarGrupo({ id: 'grupo-7' })]);

    expect(screen.getByRole('link', { name: /Casa/ }).getAttribute('href')).toBe(
      '/compartilhadas/grupo-7',
    );
    expect(screen.getByRole('link', { name: 'Ver todas' }).getAttribute('href')).toBe(
      '/compartilhadas',
    );
  });

  it('saldo negativo mostra o sinal, nao so a cor (A11Y-01)', () => {
    renderizar([fabricarGrupo({ saldoTotal: '-42.00' })]);

    expect(screen.getByText(/-\s?R\$\s?42,00/)).toBeTruthy();
  });
});

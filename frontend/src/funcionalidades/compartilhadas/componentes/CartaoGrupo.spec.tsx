import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CartaoGrupo } from './CartaoGrupo';
import type { ContaCompartilhadaListaItem } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

function fabricarGrupo(
  sobrescritas: Partial<ContaCompartilhadaListaItem> = {},
): ContaCompartilhadaListaItem {
  return {
    id: 'grupo-1',
    nome: 'Casa',
    descricao: 'Despesas da casa',
    imagemUrl: null,
    moeda: 'BRL',
    cor: '#2563EB',
    permiteParticipanteEditarProprias: true,
    meuPapel: 'ADMINISTRADOR',
    saldoTotal: '1284.60',
    quantidadeMembros: 3,
    quantidadeContas: 1,
    resumoMesAtual: { receitas: '3200.00', despesas: '1915.40', resultado: '1284.60' },
    criadoEm: '2026-06-15T12:00:00.000Z',
    ...sobrescritas,
  };
}

function renderizar(grupo: ContaCompartilhadaListaItem): ReactElement | null {
  render(
    <MemoryRouter>
      <CartaoGrupo grupo={grupo} />
    </MemoryRouter>,
  );
  return null;
}

describe('CartaoGrupo', () => {
  it('mostra nome, saldo e resumo do mes formatados', () => {
    renderizar(fabricarGrupo());

    expect(screen.getByRole('link', { name: 'Casa' })).toBeTruthy();
    expect(screen.getByText(/1\.284,60/)).toBeTruthy();
    expect(screen.getByText(/3\.200,00/)).toBeTruthy();
    expect(screen.getByText(/1\.915,40/)).toBeTruthy();
  });

  it('mostra o papel do usuario no grupo', () => {
    renderizar(fabricarGrupo({ meuPapel: 'OBSERVADOR' }));

    expect(screen.getByText('Observador')).toBeTruthy();
  });

  it('leva ao detalhe do grupo', () => {
    renderizar(fabricarGrupo({ id: 'grupo-42' }));

    expect(screen.getByRole('link', { name: 'Casa' }).getAttribute('href')).toBe(
      '/compartilhadas/grupo-42',
    );
  });

  it('saldo negativo mostra o sinal de menos, nao so a cor (A11Y-01)', () => {
    renderizar(fabricarGrupo({ saldoTotal: '-50.00' }));

    expect(screen.getByText(/-\s?R\$\s?50,00|R\$\s?-50,00/)).toBeTruthy();
  });

  it('respeita a moeda do grupo, em vez de assumir BRL', () => {
    renderizar(fabricarGrupo({ moeda: 'USD', saldoTotal: '10.00' }));

    expect(screen.getByText('US$ 10,00')).toBeTruthy();
  });

  it('flexiona membro e conta no singular', () => {
    renderizar(fabricarGrupo({ quantidadeMembros: 1, quantidadeContas: 1 }));

    expect(screen.getByText(/1 membro · 1 conta/)).toBeTruthy();
  });

  it('flexiona membros e contas no plural', () => {
    renderizar(fabricarGrupo({ quantidadeMembros: 3, quantidadeContas: 2 }));

    expect(screen.getByText(/3 membros · 2 contas/)).toBeTruthy();
  });
});

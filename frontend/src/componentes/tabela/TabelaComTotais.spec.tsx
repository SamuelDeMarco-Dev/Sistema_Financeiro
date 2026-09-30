import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TabelaComTotais } from './TabelaComTotais';
import type { ColunaTabelaComTotais } from './TabelaComTotais';

interface Linha {
  id: string;
  nome: string;
  valor: number;
}

const LINHAS: Linha[] = [
  { id: '1', nome: 'Alimentação', valor: 300 },
  { id: '2', nome: 'Transporte', valor: 100 },
  { id: '3', nome: 'Lazer', valor: 200 },
];

const COLUNAS: ColunaTabelaComTotais<Linha>[] = [
  { chave: 'nome', rotulo: 'Categoria', renderizar: (l) => l.nome, valorOrdenacao: (l) => l.nome },
  {
    chave: 'valor',
    rotulo: 'Valor',
    renderizar: (l) => String(l.valor),
    valorOrdenacao: (l) => l.valor,
    totalizar: (linhas) => String(linhas.reduce((soma, l) => soma + l.valor, 0)),
    alinharDireita: true,
  },
];

function renderTabela(props: Partial<Parameters<typeof TabelaComTotais<Linha>>[0]> = {}) {
  return render(
    <TabelaComTotais
      legenda="Tabela de teste"
      colunas={COLUNAS}
      linhas={LINHAS}
      obterChave={(l) => l.id}
      {...props}
    />,
  );
}

describe('TabelaComTotais', () => {
  it('renderiza cabeçalho, linhas e totais no rodapé', () => {
    renderTabela();

    expect(screen.getByText('Categoria')).toBeTruthy();
    expect(screen.getByText('Alimentação')).toBeTruthy();
    expect(screen.getByText('Transporte')).toBeTruthy();
    expect(screen.getByText('Lazer')).toBeTruthy();

    const rodape = document.querySelector('tfoot');
    expect(rodape?.textContent).toContain('600');
  });

  it('não renderiza rodapé quando mostrarRodape é false', () => {
    renderTabela({ mostrarRodape: false });

    expect(document.querySelector('tfoot')).toBeNull();
  });

  it('clicar no cabeçalho ordenável alterna asc → desc → nenhuma', async () => {
    renderTabela();

    const botaoValor = screen.getByRole('button', { name: /Valor/ });
    const linhasNaOrdem = (): string[] =>
      Array.from(document.querySelectorAll('tbody tr')).map(
        (linha) => within(linha as HTMLElement).getAllByRole('cell')[0]?.textContent ?? '',
      );

    expect(linhasNaOrdem()).toEqual(['Alimentação', 'Transporte', 'Lazer']);

    await userEvent.click(botaoValor);
    expect(linhasNaOrdem()).toEqual(['Transporte', 'Lazer', 'Alimentação']);

    await userEvent.click(botaoValor);
    expect(linhasNaOrdem()).toEqual(['Alimentação', 'Lazer', 'Transporte']);

    await userEvent.click(botaoValor);
    expect(linhasNaOrdem()).toEqual(['Alimentação', 'Transporte', 'Lazer']);
  });

  it('coluna sem valorOrdenacao não tem cabeçalho clicável', () => {
    renderTabela({
      colunas: [{ chave: 'nome', rotulo: 'Categoria', renderizar: (l) => l.nome }],
    });

    expect(screen.queryByRole('button', { name: /Categoria/ })).toBeNull();
  });
});

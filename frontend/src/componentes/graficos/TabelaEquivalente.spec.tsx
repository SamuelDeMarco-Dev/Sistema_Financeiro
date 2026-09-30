import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TabelaEquivalente } from './TabelaEquivalente';

interface LinhaTeste {
  id: string;
  mes: string;
  valor: number;
}

const LINHAS: LinhaTeste[] = [
  { id: '1', mes: 'jan/26', valor: 100 },
  { id: '2', mes: 'fev/26', valor: 200 },
  { id: '3', mes: 'mar/26', valor: 300 },
];

describe('TabelaEquivalente', () => {
  it('e recolhivel via <details>/<summary> nativos', () => {
    render(
      <TabelaEquivalente
        titulo="Fluxo de caixa"
        colunas={[
          { chave: 'mes', rotulo: 'Mês', renderizar: (linha) => linha.mes },
          { chave: 'valor', rotulo: 'Valor', renderizar: (linha) => String(linha.valor) },
        ]}
        linhas={LINHAS}
        obterChaveLinha={(linha) => linha.id}
      />,
    );

    expect(screen.getByText('Ver dados em tabela').closest('details')).toBeTruthy();
  });

  it('contem TODOS os pontos da serie, nao uma amostra', () => {
    render(
      <TabelaEquivalente
        titulo="Fluxo de caixa"
        colunas={[
          { chave: 'mes', rotulo: 'Mês', renderizar: (linha) => linha.mes },
          { chave: 'valor', rotulo: 'Valor', renderizar: (linha) => String(linha.valor) },
        ]}
        linhas={LINHAS}
        obterChaveLinha={(linha) => linha.id}
      />,
    );

    for (const linha of LINHAS) {
      expect(screen.getByText(linha.mes)).toBeTruthy();
      expect(screen.getByText(String(linha.valor))).toBeTruthy();
    }
  });
});

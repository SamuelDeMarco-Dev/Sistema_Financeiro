import { useState } from 'react';
import { EstadoErro, Esqueleto } from '@/componentes/feedback';
import { GraficoPizza } from '@/componentes/graficos';
import { TabelaComTotais } from '@/componentes/tabela/TabelaComTotais';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { useRelatorioPorCategoria } from '../hooks/useRelatorios';
import { primeiroEUltimoDiaDoMes } from '../utilitarios/periodo';
import type { TipoRelatorioPorCategoria } from '../tipos/relatorio';
import type { ReactElement } from 'react';

interface AbaPorCategoriaProps {
  ano: number;
  mes: number;
}

export function AbaPorCategoria({ ano, mes }: AbaPorCategoriaProps): ReactElement {
  const [tipo, setTipo] = useState<TipoRelatorioPorCategoria>('DESPESA');
  const { dataInicio, dataFim } = primeiroEUltimoDiaDoMes(ano, mes);
  const { data, isLoading, isError, refetch } = useRelatorioPorCategoria({
    dataInicio,
    dataFim,
    tipo,
  });

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Tipo" className="flex gap-2">
        {(['DESPESA', 'RECEITA'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={tipo === opcao}
            onClick={() => {
              setTipo(opcao);
            }}
            className={
              tipo === opcao
                ? 'rounded-md border border-primaria bg-primaria/10 px-3 py-1.5 text-sm font-semibold text-primaria'
                : 'rounded-md border border-borda bg-superficie px-3 py-1.5 text-sm font-medium text-texto hover:bg-borda'
            }
          >
            {opcao === 'DESPESA' ? 'Despesas' : 'Receitas'}
          </button>
        ))}
      </div>

      {isLoading ? <Esqueleto className="h-64 w-full" aria-hidden="true" /> : null}

      {isError ? (
        <EstadoErro
          mensagem="Não foi possível carregar o relatório por categoria."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      ) : null}

      {data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GraficoPizza
            titulo={tipo === 'DESPESA' ? 'Despesas por categoria' : 'Receitas por categoria'}
            itens={data.itens}
          />
          <div className="rounded-lg border border-borda bg-superficie p-4">
            <h2 className="mb-3 text-sm font-semibold text-texto">Detalhamento</h2>
            <TabelaComTotais
              legenda="Detalhamento por categoria"
              colunas={[
                {
                  chave: 'nome',
                  rotulo: 'Categoria',
                  renderizar: (item) => item.categoria.nome,
                  valorOrdenacao: (item) => item.categoria.nome,
                },
                {
                  chave: 'quantidade',
                  rotulo: 'Qtd.',
                  renderizar: (item) => String(item.quantidade),
                  valorOrdenacao: (item) => item.quantidade,
                  alinharDireita: true,
                },
                {
                  chave: 'total',
                  rotulo: 'Total',
                  renderizar: (item) => formatarMoeda(item.total),
                  valorOrdenacao: (item) => Number(item.total),
                  totalizar: () => formatarMoeda(data.total),
                  alinharDireita: true,
                },
                {
                  chave: 'percentual',
                  rotulo: '%',
                  renderizar: (item) => `${item.percentual.toFixed(1)}%`,
                  valorOrdenacao: (item) => item.percentual,
                  totalizar: (itens) =>
                    `${itens.reduce((soma, item) => soma + item.percentual, 0).toFixed(1)}%`,
                  alinharDireita: true,
                },
              ]}
              linhas={data.itens}
              obterChave={(item) => item.categoria.id}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

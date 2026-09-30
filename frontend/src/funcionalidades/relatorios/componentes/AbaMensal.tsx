import { CalendarClock, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { EstadoErro, Esqueleto } from '@/componentes/feedback';
import { GraficoPizza } from '@/componentes/graficos';
import { TabelaComTotais } from '@/componentes/tabela/TabelaComTotais';
import { CartaoIndicador } from '@/funcionalidades/dashboard/componentes/CartaoIndicador';
import { formatarDataBr } from '@/utilitarios/data';
import { somarValoresApi } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { useRelatorioMensal } from '../hooks/useRelatorios';
import type { ItemPorCategoriaSimples } from '../tipos/relatorio';
import type { ReactElement } from 'react';

interface AbaMensalProps {
  ano: number;
  mes: number;
}

const TAMANHO_ICONE = 20;

function colunasPorCategoria(): {
  chave: string;
  rotulo: string;
  renderizar: (item: ItemPorCategoriaSimples) => string;
  valorOrdenacao: (item: ItemPorCategoriaSimples) => string | number;
  totalizar?: (itens: ItemPorCategoriaSimples[]) => string;
  alinharDireita?: boolean;
}[] {
  return [
    {
      chave: 'nome',
      rotulo: 'Categoria',
      renderizar: (item) => item.categoria.nome,
      valorOrdenacao: (item) => item.categoria.nome,
    },
    {
      chave: 'total',
      rotulo: 'Total',
      renderizar: (item) => formatarMoeda(item.total),
      valorOrdenacao: (item) => Number(item.total),
      totalizar: (itens) => formatarMoeda(somarValoresApi(...itens.map((item) => item.total))),
      alinharDireita: true,
    },
    {
      chave: 'percentual',
      rotulo: '%',
      renderizar: (item) => `${item.percentual.toFixed(1)}%`,
      valorOrdenacao: (item) => item.percentual,
      alinharDireita: true,
    },
  ];
}

export function AbaMensal({ ano, mes }: AbaMensalProps): ReactElement {
  const { data, isLoading, isError, refetch } = useRelatorioMensal(ano, mes);

  if (isLoading) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Esqueleto className="h-24 w-full" />
        <Esqueleto className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EstadoErro
        mensagem="Não foi possível carregar o relatório mensal."
        onTentarNovamente={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Resumo do mês"
        className="sm:grid-cols-2 grid grid-cols-1 gap-4 lg:grid-cols-5"
      >
        <CartaoIndicador
          rotulo="Saldo inicial"
          valorFormatado={formatarMoeda(data.resumo.saldoInicial)}
          icone={<Wallet size={TAMANHO_ICONE} />}
        />
        <CartaoIndicador
          rotulo="Receitas"
          valorFormatado={formatarMoeda(data.resumo.receitas)}
          icone={<TrendingUp size={TAMANHO_ICONE} />}
          variacao={data.comparativoMesAnterior.receitas.variacao}
          direcaoFavoravel="ALTA"
        />
        <CartaoIndicador
          rotulo="Despesas"
          valorFormatado={formatarMoeda(data.resumo.despesas)}
          icone={<TrendingDown size={TAMANHO_ICONE} />}
          variacao={data.comparativoMesAnterior.despesas.variacao}
          direcaoFavoravel="BAIXA"
        />
        <CartaoIndicador
          rotulo="Resultado"
          valorFormatado={formatarMoeda(data.resumo.resultado)}
          icone={<TrendingUp size={TAMANHO_ICONE} />}
        />
        <CartaoIndicador
          rotulo="Saldo final"
          valorFormatado={formatarMoeda(data.resumo.saldoFinal)}
          icone={<CalendarClock size={TAMANHO_ICONE} />}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficoPizza titulo="Despesas por categoria" itens={data.porCategoria.despesas} />
        <div className="rounded-lg border border-borda bg-superficie p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto">Receitas por categoria</h2>
          <TabelaComTotais
            legenda="Receitas por categoria"
            colunas={colunasPorCategoria()}
            linhas={data.porCategoria.receitas}
            obterChave={(item) => item.categoria.nome}
          />
        </div>
      </div>

      <div className="rounded-lg border border-borda bg-superficie p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto">Por conta</h2>
        <TabelaComTotais
          legenda="Resultado por conta"
          colunas={[
            {
              chave: 'nome',
              rotulo: 'Conta',
              renderizar: (item) => item.conta.nome,
              valorOrdenacao: (item) => item.conta.nome,
            },
            {
              chave: 'receitas',
              rotulo: 'Receitas',
              renderizar: (item) => formatarMoeda(item.receitas),
              valorOrdenacao: (item) => Number(item.receitas),
              totalizar: (itens) =>
                formatarMoeda(somarValoresApi(...itens.map((item) => item.receitas))),
              alinharDireita: true,
            },
            {
              chave: 'despesas',
              rotulo: 'Despesas',
              renderizar: (item) => formatarMoeda(item.despesas),
              valorOrdenacao: (item) => Number(item.despesas),
              totalizar: (itens) =>
                formatarMoeda(somarValoresApi(...itens.map((item) => item.despesas))),
              alinharDireita: true,
            },
            {
              chave: 'resultado',
              rotulo: 'Resultado',
              renderizar: (item) => formatarMoeda(item.resultado),
              valorOrdenacao: (item) => Number(item.resultado),
              totalizar: (itens) =>
                formatarMoeda(somarValoresApi(...itens.map((item) => item.resultado))),
              alinharDireita: true,
            },
          ]}
          linhas={data.porConta}
          obterChave={(item) => item.conta.nome}
        />
      </div>

      <div className="rounded-lg border border-borda bg-superficie p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto">Maiores despesas</h2>
        <TabelaComTotais
          legenda="Maiores despesas do mês"
          mostrarRodape={false}
          colunas={[
            {
              chave: 'data',
              rotulo: 'Data',
              renderizar: (item) => formatarDataBr(item.data),
              valorOrdenacao: (item) => item.data,
            },
            { chave: 'descricao', rotulo: 'Descrição', renderizar: (item) => item.descricao },
            { chave: 'categoria', rotulo: 'Categoria', renderizar: (item) => item.categoria.nome },
            {
              chave: 'valor',
              rotulo: 'Valor',
              renderizar: (item) => formatarMoeda(item.valor),
              valorOrdenacao: (item) => Number(item.valor),
              alinharDireita: true,
            },
          ]}
          linhas={data.maioresDespesas}
          obterChave={(item) => item.id}
        />
      </div>
    </div>
  );
}

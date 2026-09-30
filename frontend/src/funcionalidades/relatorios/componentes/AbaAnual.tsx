import { PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { EstadoErro, Esqueleto } from '@/componentes/feedback';
import { GraficoLinha, GraficoPizza } from '@/componentes/graficos';
import { TabelaComTotais } from '@/componentes/tabela/TabelaComTotais';
import { CartaoIndicador } from '@/funcionalidades/dashboard/componentes/CartaoIndicador';
import { somarValoresApi } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { useRelatorioAnual } from '../hooks/useRelatorios';
import { rotuloMesCompleto } from '../utilitarios/periodo';
import type { ReactElement } from 'react';

interface AbaAnualProps {
  ano: number;
}

const TAMANHO_ICONE = 20;

export function AbaAnual({ ano }: AbaAnualProps): ReactElement {
  const { data, isLoading, isError, refetch } = useRelatorioAnual(ano);

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
        mensagem="Não foi possível carregar o relatório anual."
        onTentarNovamente={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Resumo do ano"
        className="sm:grid-cols-2 grid grid-cols-1 gap-4 lg:grid-cols-4"
      >
        <CartaoIndicador
          rotulo="Receitas do ano"
          valorFormatado={formatarMoeda(data.resumo.receitas)}
          icone={<TrendingUp size={TAMANHO_ICONE} />}
        />
        <CartaoIndicador
          rotulo="Despesas do ano"
          valorFormatado={formatarMoeda(data.resumo.despesas)}
          icone={<TrendingDown size={TAMANHO_ICONE} />}
        />
        <CartaoIndicador
          rotulo="Resultado do ano"
          valorFormatado={formatarMoeda(data.resumo.resultado)}
          icone={<Wallet size={TAMANHO_ICONE} />}
        />
        <CartaoIndicador
          rotulo="Taxa de poupança média"
          valorFormatado={`${data.resumo.taxaPoupancaMedia.toFixed(1)}%`}
          icone={<PiggyBank size={TAMANHO_ICONE} />}
        />
      </section>

      <section aria-label="Melhor e pior mês" className="sm:grid-cols-2 grid grid-cols-1 gap-4">
        <div className="rounded-lg border border-sucesso/40 bg-sucesso/10 p-4">
          <p className="text-sm text-textoSuave">Melhor mês</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-sucesso">
            {rotuloMesCompleto(ano, data.melhorMes.mes)}: {formatarMoeda(data.melhorMes.resultado)}
          </p>
        </div>
        <div className="rounded-lg border border-perigo/40 bg-perigo/10 p-4">
          <p className="text-sm text-textoSuave">Pior mês</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-perigo">
            {rotuloMesCompleto(ano, data.piorMes.mes)}: {formatarMoeda(data.piorMes.resultado)}
          </p>
        </div>
      </section>

      <GraficoLinha
        titulo="Receitas e despesas por mês"
        pontos={data.porMes.map((ponto) => ({
          mes: String(ponto.mes),
          rotulo: ponto.rotulo,
          receitas: ponto.receitas,
          despesas: ponto.despesas,
        }))}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficoPizza titulo="Despesas por categoria (ano)" itens={data.porCategoria} />
        <div className="rounded-lg border border-borda bg-superficie p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto">Média mensal por categoria</h2>
          <TabelaComTotais
            legenda="Média mensal de despesas por categoria"
            colunas={[
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
                totalizar: (itens) =>
                  formatarMoeda(somarValoresApi(...itens.map((item) => item.total))),
                alinharDireita: true,
              },
              {
                chave: 'mediaMensal',
                rotulo: 'Média/mês',
                renderizar: (item) => formatarMoeda(item.mediaMensal),
                valorOrdenacao: (item) => Number(item.mediaMensal),
                alinharDireita: true,
              },
            ]}
            linhas={data.porCategoria}
            obterChave={(item) => item.categoria.nome}
          />
        </div>
      </div>
    </div>
  );
}

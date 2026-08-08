import { EstadoErro, Esqueleto } from '@/componentes/feedback';
import { TabelaComTotais } from '@/componentes/tabela/TabelaComTotais';
import { somarValoresApi } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { useRelatorioPorConta } from '../hooks/useRelatorios';
import { primeiroEUltimoDiaDoMes } from '../utilitarios/periodo';
import type { ReactElement } from 'react';

interface AbaPorContaProps {
  ano: number;
  mes: number;
}

export function AbaPorConta({ ano, mes }: AbaPorContaProps): ReactElement {
  const { dataInicio, dataFim } = primeiroEUltimoDiaDoMes(ano, mes);
  const { data, isLoading, isError, refetch } = useRelatorioPorConta({ dataInicio, dataFim });

  if (isLoading) {
    return <Esqueleto className="h-64 w-full" aria-hidden="true" />;
  }

  if (isError || !data) {
    return (
      <EstadoErro
        mensagem="Não foi possível carregar o relatório por conta."
        onTentarNovamente={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-borda bg-superficie p-4">
      <h2 className="mb-3 text-sm font-semibold text-texto">Resultado por conta</h2>
      <TabelaComTotais
        legenda="Resultado por conta, com saldo inicial e final do período"
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
            totalizar: () => formatarMoeda(data.totais.receitas),
            alinharDireita: true,
          },
          {
            chave: 'despesas',
            rotulo: 'Despesas',
            renderizar: (item) => formatarMoeda(item.despesas),
            valorOrdenacao: (item) => Number(item.despesas),
            totalizar: () => formatarMoeda(data.totais.despesas),
            alinharDireita: true,
          },
          {
            chave: 'resultado',
            rotulo: 'Resultado',
            renderizar: (item) => formatarMoeda(item.resultado),
            valorOrdenacao: (item) => Number(item.resultado),
            totalizar: () => formatarMoeda(data.totais.resultado),
            alinharDireita: true,
          },
          {
            chave: 'saldoInicial',
            rotulo: 'Saldo inicial',
            renderizar: (item) => formatarMoeda(item.saldoInicial),
            valorOrdenacao: (item) => Number(item.saldoInicial),
            totalizar: (itens) =>
              formatarMoeda(somarValoresApi(...itens.map((item) => item.saldoInicial))),
            alinharDireita: true,
          },
          {
            chave: 'saldoFinal',
            rotulo: 'Saldo final',
            renderizar: (item) => formatarMoeda(item.saldoFinal),
            valorOrdenacao: (item) => Number(item.saldoFinal),
            totalizar: (itens) =>
              formatarMoeda(somarValoresApi(...itens.map((item) => item.saldoFinal))),
            alinharDireita: true,
          },
        ]}
        linhas={data.itens}
        obterChave={(item) => item.conta.id}
      />
    </div>
  );
}

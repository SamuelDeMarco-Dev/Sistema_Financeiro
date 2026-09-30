import { useState } from 'react';
import { EstadoErro, Esqueleto } from '@/componentes/feedback';
import { TabelaComTotais } from '@/componentes/tabela/TabelaComTotais';
import { formatarDataBr } from '@/utilitarios/data';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { useRelatorioFluxoCaixa } from '../hooks/useRelatorios';
import { primeiroEUltimoDiaDoMes } from '../utilitarios/periodo';
import type { GranularidadeFluxoCaixa } from '../tipos/relatorio';
import type { ReactElement } from 'react';

interface AbaFluxoCaixaProps {
  ano: number;
  mes: number;
}

export function AbaFluxoCaixa({ ano, mes }: AbaFluxoCaixaProps): ReactElement {
  const [granularidade, setGranularidade] = useState<GranularidadeFluxoCaixa>('DIARIA');
  const { dataInicio, dataFim } = primeiroEUltimoDiaDoMes(ano, mes);
  const { data, isLoading, isError, refetch } = useRelatorioFluxoCaixa({
    dataInicio,
    dataFim,
    granularidade,
  });

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Granularidade" className="flex gap-2">
        {(['DIARIA', 'MENSAL'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={granularidade === opcao}
            onClick={() => {
              setGranularidade(opcao);
            }}
            className={
              granularidade === opcao
                ? 'rounded-md border border-primaria bg-primaria/10 px-3 py-1.5 text-sm font-semibold text-primaria'
                : 'rounded-md border border-borda bg-superficie px-3 py-1.5 text-sm font-medium text-texto hover:bg-borda'
            }
          >
            {opcao === 'DIARIA' ? 'Diária' : 'Mensal'}
          </button>
        ))}
      </div>

      {isLoading ? <Esqueleto className="h-64 w-full" aria-hidden="true" /> : null}

      {isError ? (
        <EstadoErro
          mensagem="Não foi possível carregar o fluxo de caixa."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      ) : null}

      {data ? (
        <div className="flex flex-col gap-4">
          <div className="sm:grid-cols-2 grid grid-cols-1 gap-4">
            <div className="rounded-lg border border-borda bg-superficie p-4">
              <p className="text-sm text-textoSuave">Saldo inicial</p>
              <p className="font-mono text-lg font-semibold tabular-nums text-texto">
                {formatarMoeda(data.saldoInicial)}
              </p>
            </div>
            <div className="rounded-lg border border-borda bg-superficie p-4">
              <p className="text-sm text-textoSuave">Saldo final</p>
              <p className="font-mono text-lg font-semibold tabular-nums text-texto">
                {formatarMoeda(data.saldoFinal)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-borda bg-superficie p-4">
            <h2 className="mb-3 text-sm font-semibold text-texto">Evolução do saldo</h2>
            <TabelaComTotais
              legenda="Fluxo de caixa acumulado"
              mostrarRodape={false}
              colunas={[
                {
                  chave: 'data',
                  rotulo: 'Data',
                  renderizar: (item) => formatarDataBr(item.data),
                  valorOrdenacao: (item) => item.data,
                },
                {
                  chave: 'delta',
                  rotulo: 'Variação',
                  renderizar: (item) => formatarMoeda(item.delta),
                  valorOrdenacao: (item) => Number(item.delta),
                  alinharDireita: true,
                },
                {
                  chave: 'saldoAcumulado',
                  rotulo: 'Saldo acumulado',
                  renderizar: (item) => formatarMoeda(item.saldoAcumulado),
                  valorOrdenacao: (item) => Number(item.saldoAcumulado),
                  alinharDireita: true,
                },
              ]}
              linhas={data.pontos}
              obterChave={(item) => item.data}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

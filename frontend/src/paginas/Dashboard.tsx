import { useState } from 'react';
import { EstadoErro, EstadoVazio } from '@/componentes/feedback';
import { GraficoLinha, GraficoPizza } from '@/componentes/graficos';
import { Botao } from '@/componentes/ui/Botao';
import { AcaoRapidaMobile } from '@/funcionalidades/dashboard/componentes/AcaoRapidaMobile';
import { EsqueletoSecao } from '@/funcionalidades/dashboard/componentes/EsqueletoSecao';
import { SecaoAlertas } from '@/funcionalidades/dashboard/componentes/SecaoAlertas';
import { SecaoContas } from '@/funcionalidades/dashboard/componentes/SecaoContas';
import { SecaoContasCompartilhadas } from '@/funcionalidades/dashboard/componentes/SecaoContasCompartilhadas';
import { SecaoIndicadores } from '@/funcionalidades/dashboard/componentes/SecaoIndicadores';
import { SecaoUltimasMovimentacoes } from '@/funcionalidades/dashboard/componentes/SecaoUltimasMovimentacoes';
import { SelecionadorPeriodo } from '@/funcionalidades/dashboard/componentes/SelecionadorPeriodo';
import { useDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import { useFiltroPeriodoUrl } from '@/funcionalidades/dashboard/hooks/useFiltroPeriodoUrl';
import { FormularioMovimentacao } from '@/funcionalidades/movimentacoes/componentes/FormularioMovimentacao';
import { usePerfil } from '@/funcionalidades/perfil/hooks/usePerfil';
import type { ReactElement } from 'react';

function EsqueletoDashboard(): ReactElement {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, indice) => (
          <EsqueletoSecao key={indice} altura="h-12" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EsqueletoSecao altura="h-56" />
        <EsqueletoSecao altura="h-56" />
      </div>
      <EsqueletoSecao altura="h-56" />
    </div>
  );
}

export function Dashboard(): ReactElement {
  const { data: perfil } = usePerfil();
  const { periodo, definirPeriodo } = useFiltroPeriodoUrl();
  const timezone = perfil?.timezone ?? 'America/Sao_Paulo';

  const filtrosApi = {
    ...(periodo.dataInicio && { dataInicio: periodo.dataInicio }),
    ...(periodo.dataFim && { dataFim: periodo.dataFim }),
  };
  const { data, isLoading, isError, refetch } = useDashboard(filtrosApi);

  const [formularioAberto, setFormularioAberto] = useState(false);

  // Participar de um grupo ja e' ter dados: sem contar `contasCompartilhadas`
  // aqui, quem so tem grupos veria "cadastre uma conta" e nenhum sinal deles.
  const semDadosNenhuns =
    data?.contas.length === 0 &&
    data.ultimasMovimentacoes.length === 0 &&
    data.contasCompartilhadas.length === 0;

  return (
    <div className="mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-texto">Início</h1>
          {data ? <p className="text-sm text-textoSuave">{data.periodo.rotulo}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SelecionadorPeriodo periodo={periodo} timezone={timezone} aoAlterar={definirPeriodo} />
          <Botao
            className="hidden lg:inline-flex"
            onClick={() => {
              setFormularioAberto(true);
            }}
          >
            Nova movimentação
          </Botao>
        </div>
      </header>

      {isLoading ? <EsqueletoDashboard /> : null}

      {isError ? (
        <EstadoErro
          mensagem="Não foi possível carregar o dashboard."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      ) : null}

      {data ? (
        semDadosNenhuns ? (
          <EstadoVazio
            titulo="Bem-vindo ao seu Gerenciador de Finanças"
            descricao="Cadastre uma conta e registre sua primeira movimentação para ver seus indicadores aqui."
            acao={{
              rotulo: 'Nova movimentação',
              onClick: () => {
                setFormularioAberto(true);
              },
            }}
          />
        ) : (
          <>
            <SecaoAlertas alertas={data.alertas} />
            <SecaoIndicadores indicadores={data.indicadores} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GraficoLinha titulo="Fluxo de caixa (12 meses)" pontos={data.fluxoCaixa} />
              <GraficoPizza titulo="Despesas por categoria" itens={data.despesasPorCategoria} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SecaoUltimasMovimentacoes movimentacoes={data.ultimasMovimentacoes} />
              <SecaoContas contas={data.contas} />
            </div>

            <SecaoContasCompartilhadas grupos={data.contasCompartilhadas} />
          </>
        )
      ) : null}

      <AcaoRapidaMobile
        onClick={() => {
          setFormularioAberto(true);
        }}
      />

      <FormularioMovimentacao
        aberto={formularioAberto}
        aoFechar={() => {
          setFormularioAberto(false);
        }}
      />
    </div>
  );
}

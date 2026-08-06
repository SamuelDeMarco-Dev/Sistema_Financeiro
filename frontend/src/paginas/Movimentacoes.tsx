import { useState } from 'react';
import { Esqueleto, EstadoErro, EstadoVazio } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { BarraFiltros } from '@/funcionalidades/movimentacoes/componentes/BarraFiltros';
import { CartaoTotalizadores } from '@/funcionalidades/movimentacoes/componentes/CartaoTotalizadores';
import { ChipsFiltros } from '@/funcionalidades/movimentacoes/componentes/ChipsFiltros';
import { DialogoEscopoEdicao } from '@/funcionalidades/movimentacoes/componentes/DialogoEscopoEdicao';
import { DialogoExcluirMovimentacao } from '@/funcionalidades/movimentacoes/componentes/DialogoExcluirMovimentacao';
import { FormularioMovimentacao } from '@/funcionalidades/movimentacoes/componentes/FormularioMovimentacao';
import { ListaCartoesMovimentacoes } from '@/funcionalidades/movimentacoes/componentes/ListaCartoesMovimentacoes';
import { Paginacao } from '@/funcionalidades/movimentacoes/componentes/Paginacao';
import { TabelaMovimentacoes } from '@/funcionalidades/movimentacoes/componentes/TabelaMovimentacoes';
import { useFiltrosUrl } from '@/funcionalidades/movimentacoes/hooks/useFiltrosUrl';
import { useMovimentacoes } from '@/funcionalidades/movimentacoes/hooks/useMovimentacoes';
import type { FiltrosListarMovimentacoes } from '@/funcionalidades/movimentacoes/servicos/movimentacao.servico';
import type {
  EscopoRecorrencia,
  Movimentacao,
} from '@/funcionalidades/movimentacoes/tipos/movimentacao';
import { usePerfil } from '@/funcionalidades/perfil/hooks/usePerfil';
import { FormularioTransferencia } from '@/funcionalidades/transferencias/componentes/FormularioTransferencia';
import type { ReactElement } from 'react';

const LIMITE_PAGINA = 20;

function EsqueletoLista(): ReactElement {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: 6 }, (_, indice) => (
        <Esqueleto key={indice} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function Movimentacoes(): ReactElement {
  const { data: perfil } = usePerfil();
  const { filtros, definirFiltros, limparTodos } = useFiltrosUrl();

  const filtrosApi: FiltrosListarMovimentacoes = {
    ...(filtros.dataInicio && { dataInicio: filtros.dataInicio }),
    ...(filtros.dataFim && { dataFim: filtros.dataFim }),
    ...(filtros.tipo.length > 0 && { tipo: filtros.tipo }),
    ...(filtros.situacao.length > 0 && { situacao: filtros.situacao }),
    ...(filtros.contaId.length > 0 && { contaId: filtros.contaId }),
    ...(filtros.categoriaId.length > 0 && { categoriaId: filtros.categoriaId }),
    ...(filtros.etiquetaId.length > 0 && { etiquetaId: filtros.etiquetaId }),
    ...(filtros.busca.trim() !== '' && { busca: filtros.busca.trim() }),
    pagina: filtros.pagina,
    limite: LIMITE_PAGINA,
  };

  const { data, isLoading, isError, refetch } = useMovimentacoes(filtrosApi);

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [formularioTransferenciaAberto, setFormularioTransferenciaAberto] = useState(false);
  const [movimentacaoEmEdicao, setMovimentacaoEmEdicao] = useState<Movimentacao | undefined>(
    undefined,
  );
  const [escopoEdicao, setEscopoEdicao] = useState<EscopoRecorrencia | undefined>(undefined);
  const [movimentacaoParaEscolherEscopo, setMovimentacaoParaEscolherEscopo] =
    useState<Movimentacao | null>(null);
  const [movimentacaoParaExcluir, setMovimentacaoParaExcluir] = useState<Movimentacao | null>(null);

  function abrirCriacao(): void {
    setMovimentacaoEmEdicao(undefined);
    setEscopoEdicao(undefined);
    setFormularioAberto(true);
  }

  function abrirEdicao(movimentacao: Movimentacao): void {
    if (movimentacao.recorrencia !== null) {
      setMovimentacaoParaEscolherEscopo(movimentacao);
      return;
    }
    setMovimentacaoEmEdicao(movimentacao);
    setEscopoEdicao(undefined);
    setFormularioAberto(true);
  }

  function confirmarEscopoEdicao(escopo: EscopoRecorrencia): void {
    setMovimentacaoEmEdicao(movimentacaoParaEscolherEscopo ?? undefined);
    setEscopoEdicao(escopo);
    setMovimentacaoParaEscolherEscopo(null);
    setFormularioAberto(true);
  }

  const movimentacoes = data?.movimentacoes ?? [];
  const existeFiltroAtivo =
    filtros.dataInicio !== null ||
    filtros.dataFim !== null ||
    filtros.tipo.length > 0 ||
    filtros.situacao.length > 0 ||
    filtros.contaId.length > 0 ||
    filtros.categoriaId.length > 0 ||
    filtros.etiquetaId.length > 0 ||
    filtros.busca.trim() !== '';
  const semResultados = !isLoading && !isError && movimentacoes.length === 0;

  return (
    <div className="mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-texto">Movimentações</h1>
        <div className="flex gap-2">
          <Botao
            variante="secundaria"
            onClick={() => {
              setFormularioTransferenciaAberto(true);
            }}
          >
            Nova transferência
          </Botao>
          <Botao onClick={abrirCriacao}>Nova movimentação</Botao>
        </div>
      </header>

      <BarraFiltros
        filtros={filtros}
        aoAlterar={definirFiltros}
        timezone={perfil?.timezone ?? 'America/Sao_Paulo'}
      />
      <ChipsFiltros filtros={filtros} aoAlterar={definirFiltros} aoLimparTodos={limparTodos} />

      {isLoading ? <EsqueletoLista /> : null}

      {isError ? (
        <EstadoErro
          mensagem="Não foi possível carregar suas movimentações."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      ) : null}

      {semResultados ? (
        <EstadoVazio
          titulo={
            existeFiltroAtivo ? 'Nenhum resultado para o filtro' : 'Nenhuma movimentação ainda'
          }
          descricao={
            existeFiltroAtivo
              ? 'Ajuste ou limpe os filtros para ver outras movimentações.'
              : 'Registre sua primeira receita ou despesa para começar.'
          }
          acao={
            existeFiltroAtivo
              ? { rotulo: 'Limpar filtros', onClick: limparTodos }
              : { rotulo: 'Nova movimentação', onClick: abrirCriacao }
          }
        />
      ) : null}

      {data && movimentacoes.length > 0 ? (
        <>
          <CartaoTotalizadores totalizadores={data.totalizadores} />

          <TabelaMovimentacoes
            movimentacoes={movimentacoes}
            onEditar={abrirEdicao}
            onExcluir={setMovimentacaoParaExcluir}
          />
          <ListaCartoesMovimentacoes
            movimentacoes={movimentacoes}
            onEditar={abrirEdicao}
            onExcluir={setMovimentacaoParaExcluir}
          />

          <Paginacao
            paginacao={data.paginacao}
            aoMudarPagina={(pagina) => {
              definirFiltros({ pagina });
            }}
          />
        </>
      ) : null}

      <FormularioMovimentacao
        aberto={formularioAberto}
        aoFechar={() => {
          setFormularioAberto(false);
        }}
        movimentacao={movimentacaoEmEdicao}
        escopoEdicao={escopoEdicao}
      />
      <FormularioTransferencia
        aberto={formularioTransferenciaAberto}
        aoFechar={() => {
          setFormularioTransferenciaAberto(false);
        }}
      />
      <DialogoEscopoEdicao
        movimentacao={movimentacaoParaEscolherEscopo}
        aoFechar={() => {
          setMovimentacaoParaEscolherEscopo(null);
        }}
        aoConfirmar={confirmarEscopoEdicao}
      />
      <DialogoExcluirMovimentacao
        movimentacao={movimentacaoParaExcluir}
        aoFechar={() => {
          setMovimentacaoParaExcluir(null);
        }}
      />
    </div>
  );
}

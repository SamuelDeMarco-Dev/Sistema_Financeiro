import { useState } from 'react';
import { Esqueleto, EstadoErro, EstadoVazio } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import { CartaoTotalizadores } from '@/funcionalidades/movimentacoes/componentes/CartaoTotalizadores';
import { DialogoExcluirMovimentacao } from '@/funcionalidades/movimentacoes/componentes/DialogoExcluirMovimentacao';
import { FormularioMovimentacao } from '@/funcionalidades/movimentacoes/componentes/FormularioMovimentacao';
import { ListaCartoesMovimentacoes } from '@/funcionalidades/movimentacoes/componentes/ListaCartoesMovimentacoes';
import { Paginacao } from '@/funcionalidades/movimentacoes/componentes/Paginacao';
import { TabelaMovimentacoes } from '@/funcionalidades/movimentacoes/componentes/TabelaMovimentacoes';
import { useMovimentacoes } from '@/funcionalidades/movimentacoes/hooks/useMovimentacoes';
import type { Movimentacao } from '@/funcionalidades/movimentacoes/tipos/movimentacao';
import { resolverAcoesMovimentacao } from '../utilitarios/permissoes-movimentacao';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface AbaMovimentacoesGrupoProps {
  grupo: ContaCompartilhadaDetalhe;
}

const LIMITE_POR_PAGINA = 20;

/**
 * RF-58/RF-59: as movimentações do grupo, com o autor de cada lançamento.
 * Reaproveita os componentes de M3 (tabela, cartões, totalizadores,
 * paginação) passando `contaCompartilhadaId` no filtro — a listagem do
 * grupo e a pessoal nunca se misturam, o backend separa pelo escopo.
 *
 * Toda ação de escrita sai de `minhasPermissoes` aplicada ao autor da
 * linha: o cliente nunca decide permissão, só escolhe qual coluna da
 * matriz já resolvida vale para aquela linha.
 */
export function AbaMovimentacoesGrupo({ grupo }: AbaMovimentacoesGrupoProps): ReactElement {
  const { usuario } = useSessao();
  const [pagina, setPagina] = useState(1);
  const [movimentacaoParaExcluir, setMovimentacaoParaExcluir] = useState<Movimentacao | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [movimentacaoEmEdicao, setMovimentacaoEmEdicao] = useState<Movimentacao | undefined>(
    undefined,
  );

  function abrirCriacao(): void {
    setMovimentacaoEmEdicao(undefined);
    setFormularioAberto(true);
  }

  function abrirEdicao(movimentacao: Movimentacao): void {
    setMovimentacaoEmEdicao(movimentacao);
    setFormularioAberto(true);
  }

  const { data, isLoading, isError, refetch } = useMovimentacoes({
    contaCompartilhadaId: grupo.id,
    pagina,
    limite: LIMITE_POR_PAGINA,
  });

  function permitidasPorLinha(
    movimentacao: Movimentacao,
  ): ReturnType<typeof resolverAcoesMovimentacao> {
    return resolverAcoesMovimentacao({
      permissoes: grupo.minhasPermissoes,
      autorId: movimentacao.autor.id,
      usuarioId: usuario?.id,
    });
  }

  if (isLoading) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, indice) => (
          <Esqueleto key={indice} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EstadoErro
        mensagem="Não foi possível carregar as movimentações do grupo."
        onTentarNovamente={() => {
          void refetch();
        }}
      />
    );
  }

  const movimentacoes = data?.movimentacoes ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* O botao existe apenas se o servidor disse que pode criar — o
          OBSERVADOR nao ve nenhum controle de escrita (RN-30). */}
      {grupo.minhasPermissoes.podeCriarMovimentacao ? (
        <div className="flex justify-end">
          <Botao onClick={abrirCriacao}>Nova movimentação</Botao>
        </div>
      ) : null}

      {data ? <CartaoTotalizadores totalizadores={data.totalizadores} /> : null}

      {movimentacoes.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma movimentação neste grupo"
          descricao={
            grupo.minhasPermissoes.podeCriarMovimentacao
              ? 'Lance a primeira despesa ou receita do grupo para o saldo começar a andar.'
              : 'Quem participa do grupo pode lançar; você acompanha por aqui.'
          }
          {...(grupo.minhasPermissoes.podeCriarMovimentacao && {
            acao: { rotulo: 'Nova movimentação', onClick: abrirCriacao },
          })}
        />
      ) : (
        <>
          <TabelaMovimentacoes
            movimentacoes={movimentacoes}
            mostrarAutor
            permitidasPorLinha={permitidasPorLinha}
            onEditar={abrirEdicao}
            onExcluir={setMovimentacaoParaExcluir}
          />
          <ListaCartoesMovimentacoes
            movimentacoes={movimentacoes}
            mostrarAutor
            permitidasPorLinha={permitidasPorLinha}
            onEditar={abrirEdicao}
            onExcluir={setMovimentacaoParaExcluir}
          />
          {data ? (
            <Paginacao
              paginacao={data.paginacao}
              aoMudarPagina={(proxima) => {
                setPagina(proxima);
              }}
            />
          ) : null}
        </>
      )}

      <FormularioMovimentacao
        aberto={formularioAberto}
        aoFechar={() => {
          setFormularioAberto(false);
        }}
        movimentacao={movimentacaoEmEdicao}
        contaCompartilhadaId={grupo.id}
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

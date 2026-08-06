import { ItemMenuAcoes, MenuAcoes } from '@/componentes/ui/MenuAcoes';
import { useDuplicarMovimentacao } from '../hooks/useDuplicarMovimentacao';
import { useEstornarMovimentacao } from '../hooks/useEstornarMovimentacao';
import { usePagarMovimentacao } from '../hooks/usePagarMovimentacao';
import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface AcoesMovimentacaoProps {
  movimentacao: Movimentacao;
  onEditar: (movimentacao: Movimentacao) => void;
  onExcluir: (movimentacao: Movimentacao) => void;
}

const SITUACOES_PAGAVEIS = new Set(['PENDENTE', 'ATRASADA', 'PAGA_PARCIALMENTE']);
const SITUACOES_ESTORNAVEIS = new Set(['PAGA', 'PAGA_PARCIALMENTE']);

/** RF-25/RF-26/RF-29 a RF-31: as ações rápidas de uma linha da lista de
 * movimentações. Pagar/estornar disparam direto (sem diálogo — pagar usa
 * os padrões do backend: hoje, valor total) exceto para transferência,
 * que não tem essas ações por aqui (RN-39: gerencie em /transferencias).
 * Editar chama `onEditar` tanto para uma movimentação avulsa quanto para
 * uma ocorrência de recorrência — quem decide se mostra o diálogo de
 * escopo (RN-19) antes do formulário é a página, que conhece o estado de
 * ambos os diálogos. */
export function AcoesMovimentacao({
  movimentacao,
  onEditar,
  onExcluir,
}: AcoesMovimentacaoProps): ReactElement {
  const duplicar = useDuplicarMovimentacao();
  const pagar = usePagarMovimentacao();
  const estornar = useEstornarMovimentacao();

  const ehTransferencia = movimentacao.tipo === 'TRANSFERENCIA';
  const podePagar = !ehTransferencia && SITUACOES_PAGAVEIS.has(movimentacao.situacao);
  const podeEstornar = !ehTransferencia && SITUACOES_ESTORNAVEIS.has(movimentacao.situacao);

  return (
    <MenuAcoes rotuloGatilho={`Ações para ${movimentacao.descricao}`}>
      {!ehTransferencia ? (
        <ItemMenuAcoes
          onSelect={() => {
            onEditar(movimentacao);
          }}
        >
          Editar
        </ItemMenuAcoes>
      ) : null}
      {!ehTransferencia ? (
        <ItemMenuAcoes
          onSelect={() => {
            duplicar.mutate(movimentacao.id);
          }}
        >
          Duplicar
        </ItemMenuAcoes>
      ) : null}
      {podePagar ? (
        <ItemMenuAcoes
          onSelect={() => {
            pagar.mutate({ id: movimentacao.id });
          }}
        >
          Pagar
        </ItemMenuAcoes>
      ) : null}
      {podeEstornar ? (
        <ItemMenuAcoes
          onSelect={() => {
            estornar.mutate(movimentacao.id);
          }}
        >
          Estornar
        </ItemMenuAcoes>
      ) : null}
      <ItemMenuAcoes
        perigo
        onSelect={() => {
          onExcluir(movimentacao);
        }}
      >
        Excluir
      </ItemMenuAcoes>
    </MenuAcoes>
  );
}

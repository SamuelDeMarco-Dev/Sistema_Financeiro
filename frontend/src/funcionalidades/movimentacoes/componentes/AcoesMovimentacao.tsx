import { ItemMenuAcoes, MenuAcoes } from '@/componentes/ui/MenuAcoes';
import { useDuplicarMovimentacao } from '../hooks/useDuplicarMovimentacao';
import { useEstornarMovimentacao } from '../hooks/useEstornarMovimentacao';
import { usePagarMovimentacao } from '../hooks/usePagarMovimentacao';
import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

/** Quais ações de escrita a linha admite. No escopo pessoal são todas
 * (o dono pode tudo); no escopo de grupo vem de `minhasPermissoes`
 * aplicada ao autor da linha (RN-30/RN-31). */
export interface AcoesPermitidas {
  podeEditar: boolean;
  podeExcluir: boolean;
  podeDuplicar: boolean;
}

const TODAS_PERMITIDAS: AcoesPermitidas = {
  podeEditar: true,
  podeExcluir: true,
  podeDuplicar: true,
};

interface AcoesMovimentacaoProps {
  movimentacao: Movimentacao;
  onEditar: (movimentacao: Movimentacao) => void;
  onExcluir: (movimentacao: Movimentacao) => void;
  permitidas?: AcoesPermitidas;
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
  permitidas = TODAS_PERMITIDAS,
}: AcoesMovimentacaoProps): ReactElement | null {
  const duplicar = useDuplicarMovimentacao();
  const pagar = usePagarMovimentacao();
  const estornar = useEstornarMovimentacao();

  const ehTransferencia = movimentacao.tipo === 'TRANSFERENCIA';
  // Pagar e estornar alteram a movimentacao, entao seguem a mesma
  // permissao de editar — nao ha uma coluna propria para elas na matriz.
  const podePagar =
    permitidas.podeEditar && !ehTransferencia && SITUACOES_PAGAVEIS.has(movimentacao.situacao);
  const podeEstornar =
    permitidas.podeEditar && !ehTransferencia && SITUACOES_ESTORNAVEIS.has(movimentacao.situacao);
  const podeEditar = permitidas.podeEditar && !ehTransferencia;
  const podeDuplicar = permitidas.podeDuplicar && !ehTransferencia;

  // Sem nenhuma acao, nao ha menu: o OBSERVADOR nao deve ver um botao que
  // abre um menu vazio (criterio de aceite da issue #75).
  if (!podeEditar && !podeDuplicar && !podePagar && !podeEstornar && !permitidas.podeExcluir) {
    return null;
  }

  return (
    <MenuAcoes rotuloGatilho={`Ações para ${movimentacao.descricao}`}>
      {podeEditar ? (
        <ItemMenuAcoes
          onSelect={() => {
            onEditar(movimentacao);
          }}
        >
          Editar
        </ItemMenuAcoes>
      ) : null}
      {podeDuplicar ? (
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
      {permitidas.podeExcluir ? (
        <ItemMenuAcoes
          perigo
          onSelect={() => {
            onExcluir(movimentacao);
          }}
        >
          Excluir
        </ItemMenuAcoes>
      ) : null}
    </MenuAcoes>
  );
}

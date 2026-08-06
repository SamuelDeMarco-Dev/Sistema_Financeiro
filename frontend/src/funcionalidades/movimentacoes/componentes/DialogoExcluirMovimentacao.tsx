import { Botao } from '@/componentes/ui/Botao';
import { Dialog, DialogConteudo, DialogDescricao, DialogTitulo } from '@/componentes/ui/Dialog';
import { useExcluirMovimentacao } from '../hooks/useExcluirMovimentacao';
import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface DialogoExcluirMovimentacaoProps {
  movimentacao: Movimentacao | null;
  aoFechar: () => void;
}

/** RN-16/RN-39: exclusão é lógica — para transferências, remove os dois
 * lados; a mensagem avisa disso quando aplicável. */
export function DialogoExcluirMovimentacao({
  movimentacao,
  aoFechar,
}: DialogoExcluirMovimentacaoProps): ReactElement {
  const excluir = useExcluirMovimentacao();

  function aoMudarAberto(aberto: boolean): void {
    if (!aberto) {
      excluir.reset();
      aoFechar();
    }
  }

  const ehTransferencia = movimentacao?.tipo === 'TRANSFERENCIA';
  const descricao = movimentacao?.descricao ?? '';

  return (
    <Dialog open={movimentacao !== null} onOpenChange={aoMudarAberto}>
      <DialogConteudo aria-describedby="descricao-excluir-movimentacao">
        <DialogTitulo>Excluir movimentação</DialogTitulo>
        <DialogDescricao id="descricao-excluir-movimentacao">
          {ehTransferencia
            ? `Tem certeza que deseja excluir "${descricao}"? Os dois lados da transferência serão removidos. Esta ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir "${descricao}"? Esta ação não pode ser desfeita.`}
        </DialogDescricao>

        <div className="mt-6 flex justify-end gap-2">
          <Botao
            variante="secundaria"
            onClick={() => {
              aoMudarAberto(false);
            }}
          >
            Cancelar
          </Botao>
          <Botao
            carregando={excluir.isPending}
            onClick={() => {
              if (!movimentacao) return;
              excluir.mutate(movimentacao.id, { onSuccess: aoFechar });
            }}
          >
            Excluir
          </Botao>
        </div>
      </DialogConteudo>
    </Dialog>
  );
}

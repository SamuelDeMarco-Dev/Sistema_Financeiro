import { Botao } from '@/componentes/ui/Botao';
import { Dialog, DialogConteudo, DialogDescricao, DialogTitulo } from '@/componentes/ui/Dialog';
import { useArquivarConta } from '../hooks/useArquivarConta';
import { useExcluirConta } from '../hooks/useExcluirConta';
import type { Conta } from '../tipos/conta';
import type { ReactElement } from 'react';

interface DialogoExcluirContaProps {
  conta: Conta | null;
  aoFechar: () => void;
}

/** RF-17: 409 RECURSO_EM_USO na exclusao troca a acao oferecida para
 * arquivar, em vez de so mostrar um erro sem saida. */
export function DialogoExcluirConta({ conta, aoFechar }: DialogoExcluirContaProps): ReactElement {
  const excluir = useExcluirConta();
  const arquivar = useArquivarConta();
  const emUso = excluir.error?.codigo === 'RECURSO_EM_USO';

  function aoMudarAberto(aberto: boolean): void {
    if (!aberto) {
      excluir.reset();
      aoFechar();
    }
  }

  return (
    <Dialog open={conta !== null} onOpenChange={aoMudarAberto}>
      <DialogConteudo aria-describedby="descricao-excluir-conta">
        <DialogTitulo>Excluir conta</DialogTitulo>
        <DialogDescricao id="descricao-excluir-conta">
          {emUso
            ? excluir.error?.message
            : `Tem certeza que deseja excluir "${conta?.nome}"? Esta ação não pode ser desfeita.`}
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
          {emUso ? (
            <Botao
              carregando={arquivar.isPending}
              onClick={() => {
                if (!conta) return;
                arquivar.mutate(conta.id, { onSuccess: aoFechar });
              }}
            >
              Arquivar em vez disso
            </Botao>
          ) : (
            <Botao
              carregando={excluir.isPending}
              onClick={() => {
                if (!conta) return;
                excluir.mutate(conta.id, { onSuccess: aoFechar });
              }}
            >
              Excluir
            </Botao>
          )}
        </div>
      </DialogConteudo>
    </Dialog>
  );
}

import { DialogoConfirmacao } from '@/componentes/ui/DialogoConfirmacao';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { useExcluirGrupo } from '../hooks/useExcluirGrupo';
import type { ReactElement } from 'react';

interface DialogoExcluirGrupoProps {
  grupoId: string;
  nomeGrupo: string;
  quantidadeMembros: number;
  aberto: boolean;
  aoFechar: () => void;
  aoExcluir: () => void;
}

/** RN-33: exclusão lógica com confirmação explícita — o nome do grupo
 * digitado, que é também o que o servidor exige no corpo do DELETE
 * (04-API.md §16.9). Excluir afeta todos os membros de uma vez, e é por
 * isso que a contagem aparece no aviso. */
export function DialogoExcluirGrupo({
  grupoId,
  nomeGrupo,
  quantidadeMembros,
  aberto,
  aoFechar,
  aoExcluir,
}: DialogoExcluirGrupoProps): ReactElement {
  const excluir = useExcluirGrupo();

  return (
    <DialogoConfirmacao
      aberto={aberto}
      aoFechar={() => {
        excluir.reset();
        aoFechar();
      }}
      titulo={`Excluir ${nomeGrupo}`}
      descricao={
        <>
          O grupo sai da lista de{' '}
          {quantidadeMembros === 1
            ? 'você, o único membro'
            : `todos os ${quantidadeMembros} membros`}
          , junto com as contas, categorias e lançamentos dele.{' '}
          <strong className="font-semibold text-texto">
            O histórico é preservado para auditoria
          </strong>
          , mas ninguém volta a acessar o grupo pela interface.
        </>
      }
      rotuloConfirmar="Excluir grupo"
      variante="perigo"
      textoConfirmacao={nomeGrupo}
      carregando={excluir.isPending}
      erro={excluir.error ? traduzirErroApi(excluir.error) : undefined}
      aoConfirmar={() => {
        excluir.mutate({ id: grupoId, confirmacao: nomeGrupo }, { onSuccess: aoExcluir });
      }}
    />
  );
}

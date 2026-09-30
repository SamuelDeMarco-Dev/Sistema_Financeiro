import { DialogoConfirmacao } from '@/componentes/ui/DialogoConfirmacao';
import { useRemoverMembro } from '../hooks/useRemoverMembro';
import { mensagemErroMembro } from '../utilitarios/mensagens-erro-grupo';
import type { MembroDoGrupo } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface DialogoRemoverMembroProps {
  grupoId: string;
  membro: MembroDoGrupo;
  aberto: boolean;
  aoFechar: () => void;
}

/** RF-56 com RN-34: remover tira o acesso, não apaga o passado. O aviso é
 * literal porque a expectativa contrária é razoável — e um administrador que
 * remove alguém esperando que os lançamentos saiam junto teria o saldo do
 * grupo mudando sem explicação. */
export function DialogoRemoverMembro({
  grupoId,
  membro,
  aberto,
  aoFechar,
}: DialogoRemoverMembroProps): ReactElement {
  const remover = useRemoverMembro(grupoId);

  return (
    <DialogoConfirmacao
      aberto={aberto}
      aoFechar={() => {
        remover.reset();
        aoFechar();
      }}
      titulo={`Remover ${membro.usuario.nome} do grupo`}
      descricao={
        <>
          {membro.usuario.nome} perde o acesso ao grupo imediatamente.{' '}
          <strong className="font-semibold text-texto">
            Os lançamentos registrados por essa pessoa permanecem no grupo
          </strong>{' '}
          e continuam atribuídos a ela — o saldo do grupo não muda. Para trazê-la de volta, será
          preciso um novo convite.
        </>
      }
      rotuloConfirmar="Remover do grupo"
      variante="perigo"
      carregando={remover.isPending}
      erro={remover.error ? mensagemErroMembro(remover.error, 'remover') : undefined}
      aoConfirmar={() => {
        remover.mutate(membro.id, { onSuccess: aoFechar });
      }}
    />
  );
}

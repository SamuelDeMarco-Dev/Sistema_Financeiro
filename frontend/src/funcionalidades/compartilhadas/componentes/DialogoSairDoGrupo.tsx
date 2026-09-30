import { DialogoConfirmacao } from '@/componentes/ui/DialogoConfirmacao';
import { useSairDoGrupo } from '../hooks/useSairDoGrupo';
import { mensagemErroMembro } from '../utilitarios/mensagens-erro-grupo';
import type { ReactElement } from 'react';

interface DialogoSairDoGrupoProps {
  grupoId: string;
  nomeGrupo: string;
  /** Vem de `meuPapel`; o servidor decide de fato (RN-29 responde 422
   * ADMINISTRADOR_UNICO), mas saber antes evita oferecer um caminho que
   * termina em erro. */
  ehAdministrador: boolean;
  aberto: boolean;
  aoFechar: () => void;
  /** Abre o diálogo de transferência — o caminho que destrava a saída do
   * administrador. */
  aoTransferir: () => void;
  aoSair: () => void;
}

/** RN-29: o grupo nunca fica sem administrador, então para o administrador
 * este diálogo não é uma confirmação, é uma orientação — o botão leva à
 * transferência em vez de tentar uma saída que o servidor recusaria. */
export function DialogoSairDoGrupo({
  grupoId,
  nomeGrupo,
  ehAdministrador,
  aberto,
  aoFechar,
  aoTransferir,
  aoSair,
}: DialogoSairDoGrupoProps): ReactElement {
  const sair = useSairDoGrupo();

  if (ehAdministrador) {
    return (
      <DialogoConfirmacao
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={`Sair de ${nomeGrupo}`}
        descricao={
          <>
            Você administra este grupo e ele não pode ficar sem administrador.{' '}
            <strong className="font-semibold text-texto">
              Transfira a administração a outro membro
            </strong>{' '}
            e então saia. Se você é o único membro, exclua o grupo pelas configurações.
          </>
        }
        rotuloConfirmar="Transferir administração"
        aoConfirmar={() => {
          aoFechar();
          aoTransferir();
        }}
      />
    );
  }

  return (
    <DialogoConfirmacao
      aberto={aberto}
      aoFechar={() => {
        sair.reset();
        aoFechar();
      }}
      titulo={`Sair de ${nomeGrupo}`}
      descricao={
        <>
          Você perde o acesso ao grupo, ao saldo e aos lançamentos dele.{' '}
          <strong className="font-semibold text-texto">
            Os lançamentos que você registrou continuam no grupo
          </strong>
          , atribuídos a você. Para voltar, será preciso um novo convite do administrador.
        </>
      }
      rotuloConfirmar="Sair do grupo"
      variante="perigo"
      carregando={sair.isPending}
      erro={sair.error ? mensagemErroMembro(sair.error, 'sair') : undefined}
      aoConfirmar={() => {
        sair.mutate(grupoId, { onSuccess: aoSair });
      }}
    />
  );
}

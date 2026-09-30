import { useState } from 'react';
import { DialogoConfirmacao } from '@/componentes/ui/DialogoConfirmacao';
import { Selecao } from '@/componentes/ui/Selecao';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { useTransferirAdministracao } from '../hooks/useTransferirAdministracao';
import type { MembroDoGrupo } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface DialogoTransferirAdministracaoProps {
  grupoId: string;
  /** Membros ativos elegíveis — o administrador atual já vem de fora. */
  candidatos: MembroDoGrupo[];
  aberto: boolean;
  aoFechar: () => void;
  aoConcluir?: (() => void) | undefined;
}

/** RF-57/RN-28. Transferir é a única ação em que o próprio usuário perde
 * poder e não consegue desfazer sozinho — daí a confirmação por digitação,
 * o mesmo nível de trava da exclusão do grupo. */
export function DialogoTransferirAdministracao({
  grupoId,
  candidatos,
  aberto,
  aoFechar,
  aoConcluir,
}: DialogoTransferirAdministracaoProps): ReactElement {
  const [membroId, setMembroId] = useState('');
  const transferir = useTransferirAdministracao(grupoId);

  const escolhido = candidatos.find((membro) => membro.id === membroId);

  return (
    <DialogoConfirmacao
      aberto={aberto}
      aoFechar={() => {
        transferir.reset();
        setMembroId('');
        aoFechar();
      }}
      titulo="Transferir administração"
      descricao={
        candidatos.length === 0 ? (
          <>
            O grupo não tem outro membro ativo para receber a administração. Convide alguém e espere
            o aceite antes de transferir.
          </>
        ) : (
          <>
            Quem você escolher passa a administrar o grupo — convidar, remover membros, alterar
            papéis, editar e excluir o grupo.{' '}
            <strong className="font-semibold text-texto">
              Você passa a ser participante e não poderá desfazer isso sozinho
            </strong>
            : só o novo administrador poderá devolver o posto.
          </>
        )
      }
      rotuloConfirmar="Transferir administração"
      variante="perigo"
      carregando={transferir.isPending}
      erro={transferir.error ? traduzirErroApi(transferir.error) : undefined}
      confirmarDesabilitado={escolhido === undefined}
      // A digitação só faz sentido depois da escolha; até lá o botão já está
      // bloqueado pelo `confirmarDesabilitado`.
      textoConfirmacao={escolhido ? escolhido.usuario.nome : undefined}
      aoConfirmar={() => {
        if (!escolhido) return;
        transferir.mutate(escolhido.id, {
          onSuccess: () => {
            setMembroId('');
            aoConcluir?.();
            aoFechar();
          },
        });
      }}
    >
      {candidatos.length > 0 ? (
        <Selecao
          rotulo="Novo administrador"
          value={membroId}
          onChange={(evento) => {
            setMembroId(evento.target.value);
          }}
        >
          <option value="">Escolha um membro</option>
          {candidatos.map((membro) => (
            <option key={membro.id} value={membro.id}>
              {membro.usuario.nome} ({membro.usuario.email})
            </option>
          ))}
        </Selecao>
      ) : null}
    </DialogoConfirmacao>
  );
}

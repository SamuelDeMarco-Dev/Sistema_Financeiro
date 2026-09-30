import { useState } from 'react';
import { DialogoConfirmacao } from '@/componentes/ui/DialogoConfirmacao';
import { Selecao } from '@/componentes/ui/Selecao';
import { useAlterarPapelMembro } from '../hooks/useAlterarPapelMembro';
import { DESCRICAO_PAPEL, PAPEIS_CONVIDAVEIS, ROTULO_PAPEL } from '../tipos/conta-compartilhada';
import { mensagemErroMembro } from '../utilitarios/mensagens-erro-grupo';
import type { MembroDoGrupo, PapelConvidavel } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface DialogoAlterarPapelProps {
  grupoId: string;
  membro: MembroDoGrupo;
  aberto: boolean;
  aoFechar: () => void;
}

function ehConvidavel(papel: string): papel is PapelConvidavel {
  return (PAPEIS_CONVIDAVEIS as readonly string[]).includes(papel);
}

/** RF-56. O efeito da mudança fica escrito antes da confirmação: quem
 * rebaixa alguém a observador precisa saber que a pessoa deixa de lançar,
 * não descobrir pela reclamação dela depois. */
export function DialogoAlterarPapel({
  grupoId,
  membro,
  aberto,
  aoFechar,
}: DialogoAlterarPapelProps): ReactElement {
  // Começa no papel oposto ao atual: o diálogo só existe para trocar, e
  // abrir já no valor vigente exigiria um clique extra para toda mudança.
  const [papel, setPapel] = useState<PapelConvidavel>(
    membro.papel === 'OBSERVADOR' ? 'PARTICIPANTE' : 'OBSERVADOR',
  );
  const alterar = useAlterarPapelMembro(grupoId);

  return (
    <DialogoConfirmacao
      aberto={aberto}
      aoFechar={() => {
        alterar.reset();
        aoFechar();
      }}
      titulo={`Alterar o papel de ${membro.usuario.nome}`}
      descricao={
        <>
          Hoje {membro.usuario.nome} é{' '}
          <strong className="font-semibold text-texto">
            {ROTULO_PAPEL[membro.papel].toLowerCase()}
          </strong>{' '}
          no grupo. A mudança vale a partir de agora e não altera nenhum lançamento já registrado.
        </>
      }
      rotuloConfirmar="Alterar papel"
      carregando={alterar.isPending}
      erro={alterar.error ? mensagemErroMembro(alterar.error, 'alterar-papel') : undefined}
      confirmarDesabilitado={papel === membro.papel}
      aoConfirmar={() => {
        alterar.mutate({ membroId: membro.id, papel }, { onSuccess: aoFechar });
      }}
    >
      <div className="flex flex-col gap-2">
        <Selecao
          rotulo="Novo papel"
          value={papel}
          onChange={(evento) => {
            if (ehConvidavel(evento.target.value)) setPapel(evento.target.value);
          }}
        >
          {PAPEIS_CONVIDAVEIS.map((opcao) => (
            <option key={opcao} value={opcao}>
              {ROTULO_PAPEL[opcao]}
            </option>
          ))}
        </Selecao>
        <p className="rounded-md bg-superficie p-3 text-xs text-textoSuave">
          {DESCRICAO_PAPEL[papel]}
        </p>
      </div>
    </DialogoConfirmacao>
  );
}

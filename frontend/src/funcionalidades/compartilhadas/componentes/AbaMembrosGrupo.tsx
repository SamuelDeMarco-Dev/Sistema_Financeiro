import { formatarDataBr } from '@/utilitarios/data';
import { SeloPapel } from './SeloPapel';
import { DESCRICAO_PAPEL } from '../tipos/conta-compartilhada';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface AbaMembrosGrupoProps {
  grupo: ContaCompartilhadaDetalhe;
}

/** RF-56/RF-57: lista os membros ativos com papel e data de entrada. Os
 * dialogos de administracao (alterar papel, remover, transferir
 * administracao, convidar) chegam na issue #76 — aqui o que existe e' a
 * leitura, mais o aviso de que so o administrador administra, que sai de
 * `minhasPermissoes` e nao de uma comparacao de papel no cliente. */
export function AbaMembrosGrupo({ grupo }: AbaMembrosGrupoProps): ReactElement {
  const ativos = grupo.membros.filter((membro) => membro.situacao === 'ATIVO');

  return (
    <div className="flex flex-col gap-3">
      {!grupo.minhasPermissoes.podeGerenciarMembros ? (
        <p className="text-sm text-textoSuave">
          Somente o administrador do grupo convida, remove membros ou altera papéis.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {ativos.map((membro) => (
          <li
            key={membro.id}
            className="flex min-w-0 items-center gap-3 rounded-md border border-borda bg-superficie p-3"
          >
            {membro.usuario.fotoUrl ? (
              <img
                src={membro.usuario.fotoUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-borda object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primaria/10 text-sm font-semibold text-primaria"
              >
                {membro.usuario.nome.trim().charAt(0).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-texto">{membro.usuario.nome}</p>
              <p className="truncate text-sm text-textoSuave">{membro.usuario.email}</p>
              <p className="text-xs text-textoSuave">
                No grupo desde {formatarDataBr(membro.entrouEm.slice(0, 10))}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <SeloPapel papel={membro.papel} />
              <span className="hidden max-w-[16rem] text-right text-xs text-textoSuave md:block">
                {DESCRICAO_PAPEL[membro.papel]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

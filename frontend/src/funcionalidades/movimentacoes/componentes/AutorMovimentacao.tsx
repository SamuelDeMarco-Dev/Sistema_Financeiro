import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface AutorMovimentacaoProps {
  autor: Movimentacao['autor'];
}

/** RF-59: quem lançou, em toda movimentação de conta compartilhada. A
 * foto é decorativa (`alt=""`) porque o nome vem escrito ao lado — quem
 * usa leitor de tela ouviria o nome duas vezes. */
export function AutorMovimentacao({ autor }: AutorMovimentacaoProps): ReactElement {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {autor.fotoUrl ? (
        <img
          src={autor.fotoUrl}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full border border-borda object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primaria/10 text-xs font-semibold text-primaria"
        >
          {autor.nome.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate text-textoSuave">{autor.nome}</span>
    </span>
  );
}

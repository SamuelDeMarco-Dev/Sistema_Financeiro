import { Botao } from '@/componentes/ui/Botao';
import type { PaginacaoMovimentacoes } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface PaginacaoProps {
  paginacao: PaginacaoMovimentacoes;
  aoMudarPagina: (pagina: number) => void;
}

/** RF-34: informação de total sempre visível, não só as setas — quem usa
 * leitor de tela precisa saber "página 2 de 7 (137 no total)", não só
 * que existe um botão "próxima". */
export function Paginacao({ paginacao, aoMudarPagina }: PaginacaoProps): ReactElement | null {
  if (paginacao.totalPaginas <= 1) return null;

  return (
    <nav
      aria-label="Paginação de movimentações"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-textoSuave">
        Página {paginacao.pagina} de {paginacao.totalPaginas} · {paginacao.total}{' '}
        {paginacao.total === 1 ? 'movimentação' : 'movimentações'} no total
      </p>
      <div className="flex gap-2">
        <Botao
          variante="secundaria"
          className="min-h-[40px] px-3 py-1.5 text-sm"
          disabled={!paginacao.temAnterior}
          onClick={() => {
            aoMudarPagina(paginacao.pagina - 1);
          }}
        >
          Anterior
        </Botao>
        <Botao
          variante="secundaria"
          className="min-h-[40px] px-3 py-1.5 text-sm"
          disabled={!paginacao.temProxima}
          onClick={() => {
            aoMudarPagina(paginacao.pagina + 1);
          }}
        >
          Próxima
        </Botao>
      </div>
    </nav>
  );
}

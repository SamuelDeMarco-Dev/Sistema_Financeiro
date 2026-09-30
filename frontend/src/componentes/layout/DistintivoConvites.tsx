import { useQuantidadeConvitesPendentes } from '@/funcionalidades/compartilhadas/hooks/useConvitesRecebidos';
import type { ReactElement } from 'react';

/** Contagem de convites pendentes ao lado do item "Compartilhadas".
 * `aria-label` em vez do numero cru porque, lido em voz alta, "3" logo
 * depois de "Compartilhadas" nao diz o que sao os tres. */
export function DistintivoConvites(): ReactElement | null {
  const quantidade = useQuantidadeConvitesPendentes();
  if (quantidade === 0) return null;

  return (
    <span
      aria-label={`${quantidade} ${quantidade === 1 ? 'convite pendente' : 'convites pendentes'}`}
      className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primaria px-1.5 py-0.5 text-xs font-semibold leading-none text-fundo"
    >
      {quantidade}
    </span>
  );
}

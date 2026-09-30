import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';

interface AcaoRapidaMobileProps {
  onClick: () => void;
}

/** Checklist #53: ação rápida flutuante de "nova movimentação" só em
 * mobile (`lg:hidden`) — em telas maiores o botão do cabeçalho já cobre
 * isso, um segundo botão flutuante seria redundante. `bottom-20` fica
 * acima da `NavegacaoInferior` fixa. */
export function AcaoRapidaMobile({ onClick }: AcaoRapidaMobileProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Nova movimentação"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primaria text-fundo shadow-lg transition-colors hover:bg-primaria/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria lg:hidden"
    >
      <Plus className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}

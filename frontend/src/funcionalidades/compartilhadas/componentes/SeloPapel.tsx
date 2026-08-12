import { cn } from '@/utilitarios/cn';
import { ROTULO_PAPEL } from '../tipos/conta-compartilhada';
import type { PapelMembro } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface SeloPapelProps {
  papel: PapelMembro;
  className?: string;
}

// O papel e' informacao de leitura, nao de permissao: quem decide o que
// aparece e' `minhasPermissoes` (04-API.md §16.3). As cores so ajudam a
// distinguir os tres papeis de relance.
const ESTILO_PAPEL: Record<PapelMembro, string> = {
  ADMINISTRADOR: 'bg-primaria/10 text-primaria',
  PARTICIPANTE: 'bg-sucesso/10 text-sucesso',
  OBSERVADOR: 'bg-borda text-textoSuave',
};

export function SeloPapel({ papel, className }: SeloPapelProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        ESTILO_PAPEL[papel],
        className,
      )}
    >
      {ROTULO_PAPEL[papel]}
    </span>
  );
}

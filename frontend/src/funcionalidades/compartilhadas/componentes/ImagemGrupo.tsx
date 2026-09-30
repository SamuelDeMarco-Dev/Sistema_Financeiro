import { cn } from '@/utilitarios/cn';
import type { ReactElement } from 'react';

interface ImagemGrupoProps {
  nome: string;
  imagemUrl: string | null;
  /** Cor do grupo; usada apenas no fundo da inicial, quando nao ha imagem. */
  cor?: string;
  className?: string;
}

/** Imagem do grupo com recuo para a inicial do nome — todo grupo tem nome,
 * nem todo grupo tem imagem, entao a inicial e' o caso comum, nao a
 * excecao. `alt=""` porque o nome ja aparece como texto ao lado. */
export function ImagemGrupo({
  nome,
  imagemUrl,
  cor = '#2563EB',
  className,
}: ImagemGrupoProps): ReactElement {
  if (imagemUrl) {
    return (
      <img
        src={imagemUrl}
        alt=""
        className={cn('shrink-0 rounded-full border border-borda object-cover', className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        className,
      )}
      style={{ backgroundColor: `${cor}1A`, color: cor }}
    >
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}

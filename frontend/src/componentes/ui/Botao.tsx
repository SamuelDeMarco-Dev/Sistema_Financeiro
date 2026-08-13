import { forwardRef } from 'react';
import { cn } from '@/utilitarios/cn';
import type { ButtonHTMLAttributes, ReactElement } from 'react';

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  carregando?: boolean;
  variante?: 'primaria' | 'secundaria' | 'perigo';
}

const VARIANTES: Record<NonNullable<BotaoProps['variante']>, string> = {
  primaria: 'bg-primaria text-fundo hover:bg-primaria/90',
  secundaria: 'border border-borda bg-superficie text-texto hover:bg-borda',
  // Acao destrutiva (remover membro, excluir grupo): a cor precisa
  // distinguir o botao do "primaria" ao lado dele, para o clique de reflexo
  // no botao mais destacado nao ser justamente o irreversivel.
  perigo: 'bg-perigo text-fundo hover:bg-perigo/90',
};

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { carregando = false, variante = 'primaria', disabled, className, children, ...props },
  ref,
): ReactElement {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled ?? carregando}
      aria-busy={carregando}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTES[variante],
        className,
      )}
      {...props}
    >
      {carregando ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
});

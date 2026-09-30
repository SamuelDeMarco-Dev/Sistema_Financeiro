import { forwardRef, useId } from 'react';
import { cn } from '@/utilitarios/cn';
import type { ReactElement, TextareaHTMLAttributes } from 'react';

interface AreaTextoProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  erro?: string | undefined;
  /** Texto de apoio abaixo do campo — some quando há erro, para não
   * competir com a mensagem que o usuário precisa ler. */
  ajuda?: string | undefined;
}

/** Mesmo contrato do `Campo`, para texto de várias linhas. */
export const AreaTexto = forwardRef<HTMLTextAreaElement, AreaTextoProps>(function AreaTexto(
  { rotulo, erro, ajuda, id, className, rows = 3, ...props },
  ref,
): ReactElement {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;
  const idAjuda = `${idCampo}-ajuda`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <textarea
        ref={ref}
        id={idCampo}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : ajuda ? idAjuda : undefined}
        className={cn(
          'resize-y rounded-md border border-borda bg-superficie px-3 py-2 text-texto',
          'placeholder:text-textoSuave',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
          erro && 'border-perigo',
          className,
        )}
        {...props}
      />
      {erro ? (
        <p id={idErro} role="alert" aria-live="polite" className="text-sm text-perigo">
          {erro}
        </p>
      ) : ajuda ? (
        <p id={idAjuda} className="text-xs text-textoSuave">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
});

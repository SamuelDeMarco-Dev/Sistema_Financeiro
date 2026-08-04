import { forwardRef, useId } from 'react';
import { cn } from '@/utilitarios/cn';
import type { ReactElement, SelectHTMLAttributes } from 'react';

interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string;
  erro?: string | undefined;
}

export const Selecao = forwardRef<HTMLSelectElement, SelecaoProps>(function Selecao(
  { rotulo, erro, id, className, children, ...props },
  ref,
): ReactElement {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <select
        ref={ref}
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={cn(
          'rounded-md border border-borda bg-superficie px-3 py-2 text-texto',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
          erro && 'border-perigo',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {erro ? (
        <p id={idErro} role="alert" aria-live="polite" className="text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
});

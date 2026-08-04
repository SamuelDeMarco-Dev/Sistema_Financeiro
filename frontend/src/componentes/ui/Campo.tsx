import { forwardRef, useId } from 'react';
import { cn } from '@/utilitarios/cn';
import type { InputHTMLAttributes, ReactElement } from 'react';

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  // `| undefined` explicito: react-hook-form devolve `errors.x?.message` como
  // `string | undefined`, nao omitido — exactOptionalPropertyTypes exige a
  // uniao explicita para aceitar esse valor (nao so a chave ausente).
  erro?: string | undefined;
}

// forwardRef: react-hook-form's register() precisa do ref do <input> real
// para focar o campo (setFocus) e ler o valor sem re-render a cada tecla.
export const Campo = forwardRef<HTMLInputElement, CampoProps>(function Campo(
  { rotulo, erro, id, className, ...props },
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
      <input
        ref={ref}
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={cn(
          'rounded-md border border-borda bg-superficie px-3 py-2 text-texto',
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
      ) : null}
    </div>
  );
});

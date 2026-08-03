import { forwardRef, useId, useState } from 'react';
import { cn } from '@/utilitarios/cn';
import type { InputHTMLAttributes, ReactElement } from 'react';

interface CampoSenhaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  rotulo: string;
  // `| undefined` explicito — mesma razao de Campo.tsx.
  erro?: string | undefined;
}

export const CampoSenha = forwardRef<HTMLInputElement, CampoSenhaProps>(function CampoSenha(
  { rotulo, erro, id, className, ...props },
  ref,
): ReactElement {
  const [visivel, setVisivel] = useState(false);
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={idCampo}
          type={visivel ? 'text' : 'password'}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          className={cn(
            'w-full rounded-md border border-borda bg-superficie px-3 py-2 pr-20 text-texto',
            'placeholder:text-textoSuave',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
            erro && 'border-perigo',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => {
            setVisivel((atual) => !atual);
          }}
          className="absolute inset-y-0 right-2 text-sm font-medium text-primaria hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
        >
          {visivel ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {erro ? (
        <p id={idErro} role="alert" aria-live="polite" className="text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
});

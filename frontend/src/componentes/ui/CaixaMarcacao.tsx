import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactElement } from 'react';

interface CaixaMarcacaoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  rotulo: string;
}

export const CaixaMarcacao = forwardRef<HTMLInputElement, CaixaMarcacaoProps>(
  function CaixaMarcacao({ rotulo, id, ...props }, ref): ReactElement {
    const idGerado = useId();
    const idCampo = id ?? idGerado;

    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          id={idCampo}
          type="checkbox"
          className="h-4 w-4 rounded border-borda text-primaria focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
          {...props}
        />
        <label htmlFor={idCampo} className="text-sm text-texto">
          {rotulo}
        </label>
      </div>
    );
  },
);

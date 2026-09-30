import { formatarMoeda } from '@/utilitarios/formatadores';
import type { ReactElement } from 'react';

interface ItemTooltip {
  name?: string | number | undefined;
  value?: string | number | undefined;
  color?: string | undefined;
}

interface TooltipMoedaProps {
  active?: boolean | undefined;
  label?: string | number | undefined;
  payload?: ItemTooltip[] | undefined;
}

/** RF-41/RF-42: todo tooltip de gráfico monetário formata em moeda pt-BR —
 * o Recharts recebe o valor numérico em reais (nao centavos) para plotar
 * a série, mas o texto exibido ao usuário segue ADR-012 (nunca um numero
 * cru). `formatarMoeda` espera a string decimal da API ("1234.56"), por
 * isso o valor numerico do grafico e reconvertido com `toFixed(2)`. */
export function TooltipMoeda({ active, label, payload }: TooltipMoedaProps): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-borda bg-superficie p-2 text-xs shadow-lg">
      {label !== undefined ? <p className="mb-1 font-medium text-texto">{label}</p> : null}
      <ul className="flex flex-col gap-0.5">
        {payload.map((item, indice) => (
          <li key={`${String(item.name)}-${indice}`} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-textoSuave">{item.name}:</span>
            <span className="font-mono font-medium tabular-nums text-texto">
              {formatarMoeda(Number(item.value ?? 0).toFixed(2))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Alerta, SeveridadeAlerta } from '../tipos/dashboard';
import type { ReactElement } from 'react';

interface SecaoAlertasProps {
  alertas: Alerta[];
}

const ESTILO_SEVERIDADE: Record<SeveridadeAlerta, string> = {
  INFORMACAO: 'border-informacao/40 bg-informacao/10 text-informacao',
  ATENCAO: 'border-atencao/40 bg-atencao/10 text-atencao',
  CRITICO: 'border-perigo/40 bg-perigo/10 text-perigo',
};

const ICONE_SEVERIDADE: Record<SeveridadeAlerta, ReactElement> = {
  INFORMACAO: <Info className="h-4 w-4" aria-hidden="true" />,
  ATENCAO: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  CRITICO: <OctagonAlert className="h-4 w-4" aria-hidden="true" />,
};

/** RF-46 (D-7 nesta milestone): não renderiza nada quando não há alertas —
 * a seção condicional (checklist #53) evita um card vazio ocupando espaço. */
export function SecaoAlertas({ alertas }: SecaoAlertasProps): ReactElement | null {
  if (alertas.length === 0) return null;

  return (
    <section aria-label="Alertas" className="flex flex-col gap-2">
      {alertas.map((alerta, indice) => (
        <Link
          key={`${alerta.tipo}-${indice}`}
          to={alerta.urlAcao}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:brightness-95 ${ESTILO_SEVERIDADE[alerta.severidade]}`}
        >
          {ICONE_SEVERIDADE[alerta.severidade]}
          {alerta.titulo}
        </Link>
      ))}
    </section>
  );
}

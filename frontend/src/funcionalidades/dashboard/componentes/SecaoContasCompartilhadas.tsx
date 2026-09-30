import { Link } from 'react-router-dom';
import { ImagemGrupo } from '@/funcionalidades/compartilhadas/componentes/ImagemGrupo';
import { SeloPapel } from '@/funcionalidades/compartilhadas/componentes/SeloPapel';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { ContaCompartilhadaResumoDashboard } from '../tipos/dashboard';
import type { ReactElement } from 'react';

interface SecaoContasCompartilhadasProps {
  grupos: ContaCompartilhadaResumoDashboard[];
}

/** Some da tela inicial quando o usuario nao participa de nenhum grupo —
 * um "nenhum grupo" no dashboard so ocuparia espaco sem ensinar nada; a
 * explicacao do recurso vive no estado vazio de /compartilhadas. */
export function SecaoContasCompartilhadas({
  grupos,
}: SecaoContasCompartilhadasProps): ReactElement | null {
  if (grupos.length === 0) return null;

  return (
    <section
      aria-label="Contas compartilhadas"
      className="rounded-lg border border-borda bg-superficie p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-texto">Compartilhadas</h2>
        <Link
          to="/compartilhadas"
          className="text-sm font-medium text-primaria hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
        >
          Ver todas
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {grupos.map((grupo) => {
          const saldoNegativo = paraCentavos(grupo.saldoTotal) < 0;
          return (
            <li key={grupo.id} className="min-w-0">
              <Link
                to={`/compartilhadas/${grupo.id}`}
                className="flex items-center gap-3 rounded-md border border-borda p-3 transition-colors hover:bg-borda/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
              >
                <ImagemGrupo nome={grupo.nome} imagemUrl={null} className="h-9 w-9 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">{grupo.nome}</p>
                  <p
                    className={
                      saldoNegativo
                        ? 'font-mono text-sm tabular-nums text-perigo'
                        : 'font-mono text-sm tabular-nums text-texto'
                    }
                  >
                    {formatarMoeda(grupo.saldoTotal)}
                  </p>
                </div>
                <SeloPapel papel={grupo.meuPapel} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

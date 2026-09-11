import type { ReactElement } from 'react';

/** #62 (M5): staging.<dominio> e produção convivem na mesma VPS — este
 * banner é a única pista visual de que os dados aqui são descartáveis.
 * `VITE_AMBIENTE=staging` só é definido no build de homologação
 * (deploy-staging.yml), nunca no de produção. */
export function BannerHomologacao(): ReactElement | null {
  if (import.meta.env.VITE_AMBIENTE !== 'staging') return null;

  return (
    <div
      role="status"
      className="bg-atencao px-4 py-1.5 text-center text-sm font-semibold text-texto"
    >
      AMBIENTE DE HOMOLOGAÇÃO — dados de teste, não use informações reais
    </div>
  );
}

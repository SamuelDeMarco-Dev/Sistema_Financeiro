import { EstadoVazio } from '@/componentes/feedback';
import type { ReactElement, ReactNode } from 'react';

interface EnvoltorioGraficoProps {
  titulo: string;
  descricaoAcessivel: string;
  vazio: boolean;
  mensagemVazio?: string;
  alturaMinima?: number;
  children: ReactNode;
  tabela: ReactElement;
}

const ALTURA_MINIMA_PADRAO = 240;

/** Estrutura comum a GraficoLinha/GraficoPizza/GraficoBarra (issue #54):
 * `role="img"` com `aria-label` descreve a tendência para leitores de tela
 * (o SVG do Recharts em si é ignorado por eles); `TabelaEquivalente` é uma
 * IRMÃ do gráfico, nunca descendente — conteúdo interativo dentro de
 * `role="img"` seria inacessível, então a alternativa real fica fora. */
export function EnvoltorioGrafico({
  titulo,
  descricaoAcessivel,
  vazio,
  mensagemVazio = 'Sem dados no período selecionado.',
  alturaMinima = ALTURA_MINIMA_PADRAO,
  children,
  tabela,
}: EnvoltorioGraficoProps): ReactElement {
  return (
    <section aria-label={titulo} className="rounded-lg border border-borda bg-superficie p-4">
      <h2 className="mb-3 text-sm font-semibold text-texto">{titulo}</h2>
      {vazio ? (
        <EstadoVazio titulo={mensagemVazio} />
      ) : (
        <>
          <div role="img" aria-label={descricaoAcessivel} style={{ minHeight: alturaMinima }}>
            {children}
          </div>
          {tabela}
        </>
      )}
    </section>
  );
}

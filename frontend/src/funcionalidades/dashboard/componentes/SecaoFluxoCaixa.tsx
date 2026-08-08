import { EstadoVazio } from '@/componentes/feedback';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { FluxoCaixaPonto } from '../tipos/dashboard';
import type { ReactElement } from 'react';

interface SecaoFluxoCaixaProps {
  pontos: FluxoCaixaPonto[];
}

/** Representação simples (lista + barras) do fluxo de caixa — a issue #54
 * substitui isto por um `GraficoLinha` acessível; a estrutura de dados e a
 * seção em si (título, estado vazio) já ficam prontas aqui. */
export function SecaoFluxoCaixa({ pontos }: SecaoFluxoCaixaProps): ReactElement {
  const temMovimento = pontos.some((ponto) => paraCentavos(ponto.resultado) !== 0);
  const maiorMagnitude = Math.max(
    1,
    ...pontos.map((ponto) => Math.abs(paraCentavos(ponto.resultado))),
  );

  return (
    <section
      aria-label="Fluxo de caixa"
      className="rounded-lg border border-borda bg-superficie p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-texto">Fluxo de caixa (12 meses)</h2>
      {!temMovimento ? (
        <EstadoVazio titulo="Sem movimentações no período analisado" />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {pontos.map((ponto) => {
            const centavos = paraCentavos(ponto.resultado);
            const negativo = centavos < 0;
            const larguraPercentual = (Math.abs(centavos) / maiorMagnitude) * 100;

            return (
              <li key={ponto.mes} className="flex items-center gap-2 text-sm">
                <span className="w-12 shrink-0 text-textoSuave">{ponto.rotulo}</span>
                <span className="relative h-4 flex-1 rounded bg-fundo">
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 rounded ${negativo ? 'right-1/2 bg-perigo' : 'left-1/2 bg-sucesso'}`}
                    style={{ width: `${larguraPercentual / 2}%` }}
                  />
                </span>
                <span
                  className={`w-24 shrink-0 text-right font-mono tabular-nums ${negativo ? 'text-perigo' : 'text-sucesso'}`}
                >
                  {formatarMoeda(ponto.resultado)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

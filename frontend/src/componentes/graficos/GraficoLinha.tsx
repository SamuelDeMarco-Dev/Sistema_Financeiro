import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { EnvoltorioGrafico } from './EnvoltorioGrafico';
import { TabelaEquivalente } from './TabelaEquivalente';
import { TooltipMoeda } from './TooltipMoeda';
import type { ColunaTabelaEquivalente } from './TabelaEquivalente';
import type { ReactElement } from 'react';

export interface PontoGraficoLinha {
  mes: string;
  rotulo: string;
  receitas: string;
  despesas: string;
}

interface GraficoLinhaProps {
  titulo: string;
  pontos: PontoGraficoLinha[];
}

const ALTURA_MINIMA = 240;

function centavosParaReais(valorApi: string): number {
  return paraCentavos(valorApi) / 100;
}

function descreverTendencia(pontos: PontoGraficoLinha[]): string {
  if (pontos.length === 0) return 'Sem dados no período.';

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  if (!primeiro || !ultimo) return 'Sem dados no período.';

  const resultadoInicial = paraCentavos(primeiro.receitas) - paraCentavos(primeiro.despesas);
  const resultadoFinal = paraCentavos(ultimo.receitas) - paraCentavos(ultimo.despesas);
  const direcao =
    resultadoFinal > resultadoInicial
      ? 'melhorou'
      : resultadoFinal < resultadoInicial
        ? 'piorou'
        : 'manteve-se estável';

  const resultadoInicialApi = (resultadoInicial / 100).toFixed(2);
  const resultadoFinalApi = (resultadoFinal / 100).toFixed(2);

  return `Gráfico de linha com receitas e despesas de ${primeiro.rotulo} a ${ultimo.rotulo}. O resultado mensal ${direcao}, de ${formatarMoeda(resultadoInicialApi)} para ${formatarMoeda(resultadoFinalApi)}.`;
}

const COLUNAS: ColunaTabelaEquivalente<PontoGraficoLinha>[] = [
  { chave: 'rotulo', rotulo: 'Mês', renderizar: (ponto) => ponto.rotulo },
  { chave: 'receitas', rotulo: 'Receitas', renderizar: (ponto) => formatarMoeda(ponto.receitas) },
  { chave: 'despesas', rotulo: 'Despesas', renderizar: (ponto) => formatarMoeda(ponto.despesas) },
];

/** RF-41: fluxo de caixa (dashboard e relatórios) — duas linhas
 * (receitas/despesas) nas cores do Design System, ja consistentes com o
 * resto do app nos dois temas (rgb(var(--cor-...)), nao um hex fixo). */
export function GraficoLinha({ titulo, pontos }: GraficoLinhaProps): ReactElement {
  const prefereMenosMovimento = usePrefersReducedMotion();

  const dados = pontos.map((ponto) => ({
    rotulo: ponto.rotulo,
    Receitas: centavosParaReais(ponto.receitas),
    Despesas: centavosParaReais(ponto.despesas),
  }));

  return (
    <EnvoltorioGrafico
      titulo={titulo}
      descricaoAcessivel={descreverTendencia(pontos)}
      vazio={pontos.length === 0}
      alturaMinima={ALTURA_MINIMA}
      tabela={
        <TabelaEquivalente
          titulo={titulo}
          colunas={COLUNAS}
          linhas={pontos}
          obterChaveLinha={(ponto) => ponto.mes}
        />
      }
    >
      <ResponsiveContainer width="100%" height={ALTURA_MINIMA}>
        <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--cor-borda))" />
          <XAxis
            dataKey="rotulo"
            tick={{ fill: 'rgb(var(--cor-texto-suave))', fontSize: 12 }}
            angle={-35}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fill: 'rgb(var(--cor-texto-suave))', fontSize: 12 }} width={56} />
          <Tooltip content={<TooltipMoeda />} />
          <Line
            type="monotone"
            dataKey="Receitas"
            stroke="rgb(var(--cor-sucesso))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!prefereMenosMovimento}
          />
          <Line
            type="monotone"
            dataKey="Despesas"
            stroke="rgb(var(--cor-perigo))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!prefereMenosMovimento}
          />
        </LineChart>
      </ResponsiveContainer>
    </EnvoltorioGrafico>
  );
}

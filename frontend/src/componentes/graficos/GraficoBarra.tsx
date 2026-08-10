import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { EnvoltorioGrafico } from './EnvoltorioGrafico';
import { TabelaEquivalente } from './TabelaEquivalente';
import { TooltipMoeda } from './TooltipMoeda';
import type { ColunaTabelaEquivalente } from './TabelaEquivalente';
import type { ReactElement } from 'react';

export interface ItemGraficoBarra {
  rotulo: string;
  atual: string;
  anterior: string;
}

interface GraficoBarraProps {
  titulo: string;
  itens: ItemGraficoBarra[];
  rotuloAtual?: string;
  rotuloAnterior?: string;
}

const ALTURA_MINIMA = 240;

function descreverTendencia(
  itens: ItemGraficoBarra[],
  rotuloAtual: string,
  rotuloAnterior: string,
): string {
  if (itens.length === 0) return 'Sem dados no período.';

  const totalAtual = itens.reduce((soma, item) => soma + paraCentavos(item.atual), 0);
  const totalAnterior = itens.reduce((soma, item) => soma + paraCentavos(item.anterior), 0);
  const direcao =
    totalAtual > totalAnterior ? 'maior' : totalAtual < totalAnterior ? 'menor' : 'igual';

  return `Gráfico de barras comparando ${itens.length} categorias entre ${rotuloAtual} e ${rotuloAnterior}. O total de ${rotuloAtual} (${formatarMoeda((totalAtual / 100).toFixed(2))}) é ${direcao} que o de ${rotuloAnterior} (${formatarMoeda((totalAnterior / 100).toFixed(2))}).`;
}

/** RF-75-ish (comparativo, reaproveitado por #52/#55): duas barras por
 * categoria — período atual (cor primária) e anterior (tom neutro,
 * `textoSuave`) — o destaque visual do período atual segue as cores do
 * Design System, nao um hex arbitrario. */
export function GraficoBarra({
  titulo,
  itens,
  rotuloAtual = 'Atual',
  rotuloAnterior = 'Anterior',
}: GraficoBarraProps): ReactElement {
  const prefereMenosMovimento = usePrefersReducedMotion();

  const dados = itens.map((item) => ({
    rotulo: item.rotulo,
    [rotuloAtual]: paraCentavos(item.atual) / 100,
    [rotuloAnterior]: paraCentavos(item.anterior) / 100,
  }));

  const colunas: ColunaTabelaEquivalente<ItemGraficoBarra>[] = [
    { chave: 'rotulo', rotulo: 'Categoria', renderizar: (item) => item.rotulo },
    { chave: 'atual', rotulo: rotuloAtual, renderizar: (item) => formatarMoeda(item.atual) },
    {
      chave: 'anterior',
      rotulo: rotuloAnterior,
      renderizar: (item) => formatarMoeda(item.anterior),
    },
  ];

  return (
    <EnvoltorioGrafico
      titulo={titulo}
      descricaoAcessivel={descreverTendencia(itens, rotuloAtual, rotuloAnterior)}
      vazio={itens.length === 0}
      alturaMinima={ALTURA_MINIMA}
      tabela={
        <TabelaEquivalente
          titulo={titulo}
          colunas={colunas}
          linhas={itens}
          obterChaveLinha={(item) => item.rotulo}
        />
      }
    >
      <ResponsiveContainer width="100%" height={ALTURA_MINIMA}>
        <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
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
          <Bar
            dataKey={rotuloAtual}
            fill="rgb(var(--cor-primaria))"
            isAnimationActive={!prefereMenosMovimento}
          />
          <Bar
            dataKey={rotuloAnterior}
            fill="rgb(var(--cor-texto-suave))"
            isAnimationActive={!prefereMenosMovimento}
          />
        </BarChart>
      </ResponsiveContainer>
    </EnvoltorioGrafico>
  );
}

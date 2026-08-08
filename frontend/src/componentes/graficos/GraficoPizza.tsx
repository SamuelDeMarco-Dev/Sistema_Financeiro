import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { EnvoltorioGrafico } from './EnvoltorioGrafico';
import { TabelaEquivalente } from './TabelaEquivalente';
import type { ColunaTabelaEquivalente } from './TabelaEquivalente';
import type { ReactElement } from 'react';
import type { TooltipValueType } from 'recharts';

export interface ItemGraficoPizza {
  categoria: { id: string; nome: string; cor: string };
  total: string;
  percentual: number;
}

interface GraficoPizzaProps {
  titulo: string;
  itens: ItemGraficoPizza[];
}

const ALTURA_MINIMA = 240;
const RAIO_EXTERNO = 90;

function descreverTendencia(itens: ItemGraficoPizza[]): string {
  if (itens.length === 0) return 'Sem dados no período.';
  const maior = itens[0];
  if (!maior) return 'Sem dados no período.';

  const outras = itens.length - 1;
  const complemento =
    outras > 0
      ? `, seguida de ${outras} outra${outras > 1 ? 's' : ''} categoria${outras > 1 ? 's' : ''}`
      : '';

  return `Gráfico de pizza com a distribuição por categoria. ${maior.categoria.nome} é a maior, com ${maior.percentual.toFixed(1)}% (${formatarMoeda(maior.total)})${complemento}.`;
}

const COLUNAS: ColunaTabelaEquivalente<ItemGraficoPizza>[] = [
  { chave: 'categoria', rotulo: 'Categoria', renderizar: (item) => item.categoria.nome },
  { chave: 'total', rotulo: 'Total', renderizar: (item) => formatarMoeda(item.total) },
  {
    chave: 'percentual',
    rotulo: 'Percentual',
    renderizar: (item) => `${item.percentual.toFixed(1)}%`,
  },
];

// Assinatura posicional exigida pelo tipo `Formatter` do Recharts —
// so os dois primeiros argumentos importam aqui.
function tooltipPizza(
  valor: TooltipValueType | undefined,
  nome: number | string | undefined,
): [string, string] {
  return [formatarMoeda((Number(valor ?? 0) / 100).toFixed(2)), String(nome ?? '')];
}

/** RF-42: cada fatia usa `categoria.cor` (o mesmo hex vindo do backend que
 * a categoria usa em qualquer outro lugar do app) — "mesma categoria,
 * mesma cor em todo gráfico" sai de graça, sem paleta própria. */
export function GraficoPizza({ titulo, itens }: GraficoPizzaProps): ReactElement {
  const prefereMenosMovimento = usePrefersReducedMotion();

  // Pie le `fill` de cada item de `data` diretamente — nao precisa de
  // `<Cell>` (descontinuado no recharts 3) para colorir cada fatia.
  const dados = itens.map((item) => ({
    nome: item.categoria.nome,
    valor: paraCentavos(item.total),
    fill: item.categoria.cor,
  }));

  return (
    <EnvoltorioGrafico
      titulo={titulo}
      descricaoAcessivel={descreverTendencia(itens)}
      vazio={itens.length === 0}
      alturaMinima={ALTURA_MINIMA}
      tabela={
        <TabelaEquivalente
          titulo={titulo}
          colunas={COLUNAS}
          linhas={itens}
          obterChaveLinha={(item) => item.categoria.id}
        />
      }
    >
      <ResponsiveContainer width="100%" height={ALTURA_MINIMA}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={dados}
            dataKey="valor"
            nameKey="nome"
            cx="50%"
            cy="50%"
            outerRadius={RAIO_EXTERNO}
            isAnimationActive={!prefereMenosMovimento}
          />
          <Tooltip formatter={tooltipPizza} />
        </PieChart>
      </ResponsiveContainer>
    </EnvoltorioGrafico>
  );
}

import { Prisma } from '@prisma/client';
import { paraDataIso } from '@/utilitarios/data';
import type { Meta } from '@prisma/client';

const CASAS_PERCENTUAL = 2;
const PERCENTUAL_MAXIMO_EXIBIDO = 100;
const MS_POR_DIA = 1000 * 60 * 60 * 24;

export interface MetaDTO {
  id: string;
  nome: string;
  descricao: string | null;
  valorAlvo: string;
  valorAcumulado: string;
  valorRestante: string;
  percentualProgresso: number;
  prazoEm: string | null;
  diasRestantes: number | null;
  aporteMensalNecessario: string | null;
  situacao: Meta['situacao'];
  cor: string;
  icone: string;
  concluidaEm: string | null;
  criadoEm: string;
}

/** RN-46: progresso = valorAcumulado / valorAlvo, limitado a 100% na
 * exibicao — uma meta superada (aporte alem do alvo) nunca mostra mais
 * de 100%, mesmo que valorAcumulado > valorAlvo internamente. */
function calcularPercentualProgresso(
  valorAlvo: Prisma.Decimal,
  valorAcumulado: Prisma.Decimal,
): number {
  const percentual = Number(
    valorAcumulado.dividedBy(valorAlvo).times(100).toDecimalPlaces(CASAS_PERCENTUAL),
  );
  return Math.min(PERCENTUAL_MAXIMO_EXIBIDO, percentual);
}

/** Numero de meses inteiros de "hoje" ate `prazoEm`, nunca menor que 1 —
 * um prazo dentro do mes corrente ainda precisa de UM aporte, nao de
 * zero (a divisao por "meses restantes" nao pode dar Infinity). */
function calcularMesesRestantes(hoje: Date, prazoEm: Date): number {
  const diffMeses =
    (prazoEm.getUTCFullYear() - hoje.getUTCFullYear()) * 12 +
    (prazoEm.getUTCMonth() - hoje.getUTCMonth());
  return Math.max(1, diffMeses);
}

/** RF-63: valor mensal necessario para cumprir o prazo, arredondado para
 * cima (melhor exigir um pouco a mais do que deixar a meta atras). */
function calcularAporteMensalNecessario(
  valorRestante: Prisma.Decimal,
  hoje: Date,
  prazoEm: Date,
): Prisma.Decimal {
  const mesesRestantes = calcularMesesRestantes(hoje, prazoEm);
  return valorRestante.dividedBy(mesesRestantes).toDecimalPlaces(2, Prisma.Decimal.ROUND_UP);
}

export function mapearMeta(meta: Meta, hoje: Date): MetaDTO {
  const valorRestante = Prisma.Decimal.max(0, meta.valorAlvo.minus(meta.valorAcumulado));
  const diasRestantes = meta.prazoEm
    ? Math.round((meta.prazoEm.getTime() - hoje.getTime()) / MS_POR_DIA)
    : null;
  const aporteMensalNecessario = meta.prazoEm
    ? calcularAporteMensalNecessario(valorRestante, hoje, meta.prazoEm).toFixed(2)
    : null;

  return {
    id: meta.id,
    nome: meta.nome,
    descricao: meta.descricao,
    valorAlvo: meta.valorAlvo.toFixed(2),
    valorAcumulado: meta.valorAcumulado.toFixed(2),
    valorRestante: valorRestante.toFixed(2),
    percentualProgresso: calcularPercentualProgresso(meta.valorAlvo, meta.valorAcumulado),
    prazoEm: meta.prazoEm ? paraDataIso(meta.prazoEm) : null,
    diasRestantes,
    aporteMensalNecessario,
    situacao: meta.situacao,
    cor: meta.cor,
    icone: meta.icone,
    concluidaEm: meta.concluidaEm ? meta.concluidaEm.toISOString() : null,
    criadoEm: meta.criadoEm.toISOString(),
  };
}

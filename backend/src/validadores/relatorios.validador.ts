import { z } from 'zod';
import { ehDataIsoValida } from '@/utilitarios/data';

const dataIsoSchema = z
  .string()
  .refine(ehDataIsoValida, 'Data invalida. Use o formato AAAA-MM-DD.');

// M6: contas de grupo chegam depois — mesmo padrao de contas.validador.ts.
const contaCompartilhadaIdSchema = z
  .unknown()
  .optional()
  .refine((valor) => valor === undefined || valor === null, {
    message: 'Contas de grupo ainda nao sao suportadas nesta versao.',
  });

const ANOS_MAXIMO_INTERVALO = 5;
const DIAS_MAXIMO_INTERVALO = ANOS_MAXIMO_INTERVALO * 366; // folgado o bastante p/ nunca cortar um intervalo de exatos 5 anos, mesmo com bissextos.

// RF-73/RF-74 (issue #52): periodo livre — ao contrario de #47/#49
// (opcional, com padrao), aqui dataInicio/dataFim sao obrigatorias e o
// intervalo tem um teto de 5 anos (custo da consulta crescendo com o
// tamanho da janela, sobretudo na granularidade diaria do fluxo de caixa).
function validarPeriodoLivre(
  dados: { dataInicio: string; dataFim: string },
  ctx: z.RefinementCtx,
): void {
  if (dados.dataInicio > dados.dataFim) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataFim'],
      message: 'dataFim deve ser maior ou igual a dataInicio.',
    });
    return;
  }
  const dataInicio = new Date(`${dados.dataInicio}T00:00:00.000Z`);
  const dataFim = new Date(`${dados.dataFim}T00:00:00.000Z`);
  const diasNoIntervalo = (dataFim.getTime() - dataInicio.getTime()) / (24 * 60 * 60 * 1000);
  if (diasNoIntervalo > DIAS_MAXIMO_INTERVALO) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataFim'],
      message: `O intervalo entre dataInicio e dataFim nao pode ultrapassar ${ANOS_MAXIMO_INTERVALO} anos.`,
    });
  }
}

export const obterRelatorioMensalSchema = z.object({
  query: z.object({
    ano: z.coerce
      .number()
      .int('Ano invalido.')
      .min(2000, 'O ano deve estar entre 2000 e 2100.')
      .max(2100, 'O ano deve estar entre 2000 e 2100.'),
    mes: z.coerce
      .number()
      .int('Mes invalido.')
      .min(1, 'O mes deve estar entre 1 e 12.')
      .max(12, 'O mes deve estar entre 1 e 12.'),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type ObterRelatorioMensalQuery = z.infer<typeof obterRelatorioMensalSchema>['query'];

export const obterRelatorioAnualSchema = z.object({
  query: z.object({
    ano: z.coerce
      .number()
      .int('Ano invalido.')
      .min(2000, 'O ano deve estar entre 2000 e 2100.')
      .max(2100, 'O ano deve estar entre 2000 e 2100.'),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type ObterRelatorioAnualQuery = z.infer<typeof obterRelatorioAnualSchema>['query'];

const TIPOS_POR_CATEGORIA = ['RECEITA', 'DESPESA'] as const;

export const obterRelatorioPorCategoriaSchema = z.object({
  query: z
    .object({
      dataInicio: dataIsoSchema,
      dataFim: dataIsoSchema,
      tipo: z.enum(TIPOS_POR_CATEGORIA).optional().default('DESPESA'),
      incluirSubcategorias: z
        .enum(['true', 'false'])
        .optional()
        .default('false')
        .transform((valor) => valor === 'true'),
      contaCompartilhadaId: contaCompartilhadaIdSchema,
    })
    .superRefine(validarPeriodoLivre),
});

export type ObterRelatorioPorCategoriaQuery = z.infer<
  typeof obterRelatorioPorCategoriaSchema
>['query'];

export const obterRelatorioPorContaSchema = z.object({
  query: z
    .object({
      dataInicio: dataIsoSchema,
      dataFim: dataIsoSchema,
      contaCompartilhadaId: contaCompartilhadaIdSchema,
    })
    .superRefine(validarPeriodoLivre),
});

export type ObterRelatorioPorContaQuery = z.infer<typeof obterRelatorioPorContaSchema>['query'];

const GRANULARIDADES = ['DIARIA', 'MENSAL'] as const;

export const obterRelatorioFluxoCaixaSchema = z.object({
  query: z
    .object({
      dataInicio: dataIsoSchema,
      dataFim: dataIsoSchema,
      granularidade: z.enum(GRANULARIDADES).optional().default('MENSAL'),
      contaCompartilhadaId: contaCompartilhadaIdSchema,
    })
    .superRefine(validarPeriodoLivre),
});

export type ObterRelatorioFluxoCaixaQuery = z.infer<typeof obterRelatorioFluxoCaixaSchema>['query'];

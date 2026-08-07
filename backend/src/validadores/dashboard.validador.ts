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

// RF-47: dataInicio/dataFim vem juntas ou nenhuma das duas (usa o periodo
// padrao — mes corrente no timezone do perfil, resolvido no servico).
export const obterIndicadoresSchema = z.object({
  query: z
    .object({
      dataInicio: dataIsoSchema.optional(),
      dataFim: dataIsoSchema.optional(),
      contaCompartilhadaId: contaCompartilhadaIdSchema,
    })
    .superRefine((dados, ctx) => {
      if ((dados.dataInicio === undefined) !== (dados.dataFim === undefined)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataFim'],
          message: 'Informe dataInicio e dataFim juntas, ou nenhuma das duas.',
        });
        return;
      }
      if (
        dados.dataInicio !== undefined &&
        dados.dataFim !== undefined &&
        dados.dataInicio > dados.dataFim
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataFim'],
          message: 'dataFim deve ser maior ou igual a dataInicio.',
        });
      }
    }),
});

export type ObterIndicadoresQuery = z.infer<typeof obterIndicadoresSchema>['query'];

// RF-41: padrao 12, maximo 36 (3 anos) — acima disso o grafico perde
// legibilidade e a consulta deixa de ser um caso de uso real do dashboard.
export const obterFluxoCaixaSchema = z.object({
  query: z.object({
    meses: z.coerce
      .number()
      .int('Numero de meses invalido.')
      .min(1, 'Informe ao menos 1 mes.')
      .max(36, 'O maximo e 36 meses.')
      .optional()
      .default(12),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type ObterFluxoCaixaQuery = z.infer<typeof obterFluxoCaixaSchema>['query'];

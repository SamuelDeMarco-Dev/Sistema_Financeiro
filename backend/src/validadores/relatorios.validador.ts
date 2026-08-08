import { z } from 'zod';

// M6: contas de grupo chegam depois — mesmo padrao de contas.validador.ts.
const contaCompartilhadaIdSchema = z
  .unknown()
  .optional()
  .refine((valor) => valor === undefined || valor === null, {
    message: 'Contas de grupo ainda nao sao suportadas nesta versao.',
  });

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

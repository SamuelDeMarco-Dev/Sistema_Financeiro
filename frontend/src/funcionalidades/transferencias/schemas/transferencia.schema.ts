import { z } from 'zod';

// RN-24: mesma regra de valor de movimentacoes.schema.ts (regex evita
// Number() em dinheiro — CLAUDE.md regra 1).
const valorPositivoSchema = z
  .string()
  .trim()
  .min(1, 'Informe o valor.')
  .transform((valor) => valor.replace(',', '.'))
  .refine((valor) => /^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/.test(valor), {
    message: 'O valor deve ser maior que zero, com no máximo 2 casas decimais.',
  });

/** Espelha `criarTransferenciaSchema` do backend (RN-24: contas diferentes). */
export const transferenciaSchema = z
  .object({
    contaOrigemId: z.string().min(1, 'Informe a conta de origem.'),
    contaDestinoId: z.string().min(1, 'Informe a conta de destino.'),
    valor: valorPositivoSchema,
    data: z.string().nullable(),
    descricao: z
      .string()
      .trim()
      .max(200, 'Máximo de 200 caracteres.')
      .optional()
      .transform((valor) => (valor === '' ? undefined : valor)),
  })
  .superRefine((dados, ctx) => {
    if (dados.data === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['data'], message: 'Informe a data.' });
    }
    if (dados.contaOrigemId !== '' && dados.contaOrigemId === dados.contaDestinoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contaDestinoId'],
        message: 'Escolha uma conta diferente da origem.',
      });
    }
  });

export type TransferenciaFormulario = z.infer<typeof transferenciaSchema>;

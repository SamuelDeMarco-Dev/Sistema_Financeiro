import { z } from 'zod';
import { ehDataIsoValida } from '@/utilitarios/data';

// RN-24: valor > 0, mesma regra de movimentacoes (regex evita Number() em
// dinheiro — RN-08/CLAUDE.md regra 1).
const valorPositivoSchema = z
  .string()
  .regex(
    /^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/,
    'O valor deve ser maior que zero, com no maximo 2 casas decimais.',
  );

const dataIsoSchema = z
  .string()
  .refine(ehDataIsoValida, 'Data invalida. Use o formato AAAA-MM-DD.');

export const criarTransferenciaSchema = z.object({
  body: z.object({
    contaOrigemId: z.string().min(1, 'Informe a conta de origem.'),
    contaDestinoId: z.string().min(1, 'Informe a conta de destino.'),
    valor: valorPositivoSchema,
    data: dataIsoSchema,
    descricao: z
      .string()
      .trim()
      .min(2, 'A descricao deve ter no minimo 2 caracteres.')
      .max(200)
      .optional(),
    observacao: z.string().trim().max(1000).optional(),
    efetivada: z.boolean().optional().default(true),
  }),
});

export type CriarTransferenciaDTO = z.infer<typeof criarTransferenciaSchema>['body'];

export const idTransferenciaSchema = z.object({
  params: z.object({ transferenciaId: z.string().min(1, 'Id invalido.') }),
});

export type IdTransferenciaParam = z.infer<typeof idTransferenciaSchema>['params'];

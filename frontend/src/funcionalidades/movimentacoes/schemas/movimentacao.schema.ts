import { z } from 'zod';
import { SITUACOES_MOVIMENTACAO, TIPOS_MOVIMENTACAO_CRIACAO } from '../tipos/movimentacao';

// RN-08: estritamente positivo, no maximo 2 casas — mesmo regex do
// backend (movimentacoes.validador.ts), aceitando virgula (convencao
// pt-BR) alem do ponto.
const valorPositivoSchema = z
  .string()
  .trim()
  .min(1, 'Informe o valor.')
  .transform((valor) => valor.replace(',', '.'))
  .refine((valor) => /^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/.test(valor), {
    message: 'O valor deve ser maior que zero, com no máximo 2 casas decimais.',
  });

/** Espelha as regras condicionais de `criarMovimentacaoSchema` do backend
 * (RN-12/RN-14): dataEfetivacao obrigatória para PAGA/PAGA_PARCIALMENTE;
 * valorPago obrigatório e válido para PAGA_PARCIALMENTE. */
export const movimentacaoSchema = z
  .object({
    tipo: z.enum(TIPOS_MOVIMENTACAO_CRIACAO),
    descricao: z.string().trim().min(2, 'A descrição deve ter no mínimo 2 caracteres.').max(200),
    observacao: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((valor) => (valor === '' ? undefined : valor)),
    valor: valorPositivoSchema,
    dataCompetencia: z.string().nullable(),
    dataVencimento: z.string().nullable(),
    situacao: z.enum(SITUACOES_MOVIMENTACAO),
    dataEfetivacao: z.string().nullable(),
    valorPago: z
      .string()
      .optional()
      .transform((valor) => (valor === '' ? undefined : valor)),
    contaId: z.string().min(1, 'Informe a conta.'),
    categoriaId: z.string().min(1, 'Informe a categoria.'),
    etiquetaIds: z.array(z.string()),
  })
  .superRefine((dados, ctx) => {
    if (dados.dataCompetencia === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dataCompetencia'],
        message: 'Informe a data de competência.',
      });
    }

    const efetivada = dados.situacao === 'PAGA' || dados.situacao === 'PAGA_PARCIALMENTE';
    if (efetivada && dados.dataEfetivacao === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dataEfetivacao'],
        message: 'Informe a data de efetivação.',
      });
    }

    if (dados.situacao === 'PAGA_PARCIALMENTE') {
      if (dados.valorPago === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valorPago'],
          message: 'Informe o valor pago.',
        });
      } else if (!/^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/.test(dados.valorPago.replace(',', '.'))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valorPago'],
          message: 'Valor pago inválido.',
        });
      }
    }
  });

export type MovimentacaoFormulario = z.infer<typeof movimentacaoSchema>;

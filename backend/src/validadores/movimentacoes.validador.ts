import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { dentroDoLimiteDeCompetencia, ehDataIsoValida } from '@/utilitarios/data';

const TIPOS_MOVIMENTACAO_ACEITOS = ['RECEITA', 'DESPESA'] as const;
const SITUACOES = ['PENDENTE', 'PAGA', 'PAGA_PARCIALMENTE', 'ATRASADA', 'CANCELADA'] as const;

// RN-08: estritamente positivo, maximo 2 casas — o lookahead negativo
// rejeita "0", "0.0" e "0.00" sem precisar de Number() sobre o decimal.
const valorPositivoSchema = z
  .string()
  .regex(
    /^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/,
    'O valor deve ser maior que zero, com no maximo 2 casas decimais.',
  );

const valorDecimalSchema = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Valor invalido. Use o formato 1234.56.');

const dataIsoSchema = z
  .string()
  .refine(ehDataIsoValida, 'Data invalida. Use o formato AAAA-MM-DD.');

// RN-13
const dataCompetenciaSchema = dataIsoSchema.refine(
  dentroDoLimiteDeCompetencia,
  'A data de competencia deve estar entre 20 anos atras e 10 anos no futuro.',
);

// M3: cartoes chegam em M8 — o campo e aceito no corpo (contrato futuro de
// 04-API.md §12.2) mas rejeitado explicitamente enquanto Cartao nao existir.
const cartaoIdSchema = z
  .unknown()
  .optional()
  .refine((valor) => valor === undefined || valor === null, {
    message: 'Cartoes ainda nao sao suportados nesta versao.',
  });

// M6: contas de grupo — mesmo padrao de contas.validador.ts.
const contaCompartilhadaIdSchema = z
  .unknown()
  .optional()
  .refine((valor) => valor === undefined || valor === null, {
    message: 'Contas de grupo ainda nao sao suportadas nesta versao.',
  });

export const criarMovimentacaoSchema = z.object({
  body: z
    .object({
      tipo: z.enum(TIPOS_MOVIMENTACAO_ACEITOS, {
        errorMap: () => ({
          message:
            'Tipo invalido. Use RECEITA ou DESPESA — transferencias tem rota propria (/transferencias).',
        }),
      }),
      descricao: z.string().trim().min(2, 'A descricao deve ter no minimo 2 caracteres.').max(200),
      observacao: z.string().trim().max(1000).optional(),
      valor: valorPositivoSchema,
      dataCompetencia: dataCompetenciaSchema,
      dataVencimento: dataIsoSchema.optional(),
      situacao: z.enum(SITUACOES).optional().default('PENDENTE'),
      dataEfetivacao: dataIsoSchema.optional(),
      valorPago: valorDecimalSchema.optional(),
      contaId: z.string().min(1, 'Informe a conta.'),
      contaCompartilhadaId: contaCompartilhadaIdSchema,
      cartaoId: cartaoIdSchema,
      categoriaId: z.string().min(1, 'Informe a categoria.'),
      etiquetaIds: z.array(z.string().min(1)).max(10, 'Maximo de 10 etiquetas.').optional(),
    })
    .superRefine((dados, ctx) => {
      const efetivada = dados.situacao === 'PAGA' || dados.situacao === 'PAGA_PARCIALMENTE';
      if (efetivada && dados.dataEfetivacao === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataEfetivacao'],
          message: 'Informe a data de efetivacao para uma movimentacao paga.',
        });
      }
      if (!efetivada && dados.dataEfetivacao !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataEfetivacao'],
          message: 'Data de efetivacao so e aceita para movimentacoes pagas.',
        });
      }

      if (dados.situacao === 'PAGA_PARCIALMENTE') {
        if (dados.valorPago === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['valorPago'],
            message: 'Informe o valor pago para um pagamento parcial.',
          });
        } else if (!(
          new Prisma.Decimal(dados.valorPago).greaterThan(0) &&
          new Prisma.Decimal(dados.valorPago).lessThan(new Prisma.Decimal(dados.valor))
        )) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['valorPago'],
            message: 'O valor pago deve ser maior que zero e menor que o valor total.',
          });
        }
      }
    }),
});

export type CriarMovimentacaoDTO = z.infer<typeof criarMovimentacaoSchema>['body'];

export const idParamMovimentacaoSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
});

export type IdParamMovimentacao = z.infer<typeof idParamMovimentacaoSchema>['params'];

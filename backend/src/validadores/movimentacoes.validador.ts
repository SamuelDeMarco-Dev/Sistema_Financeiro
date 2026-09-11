import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { dentroDoLimiteDeCompetencia, ehDataIsoValida } from '@/utilitarios/data';

const TIPOS_MOVIMENTACAO_ACEITOS = ['RECEITA', 'DESPESA'] as const;
const SITUACOES = ['PENDENTE', 'PAGA', 'PAGA_PARCIALMENTE', 'ATRASADA', 'CANCELADA'] as const;
const FREQUENCIAS_RECORRENCIA = [
  'DIARIA',
  'SEMANAL',
  'QUINZENAL',
  'MENSAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
] as const;
const ESCOPOS_RECORRENCIA = ['APENAS_ESTA', 'ESTA_E_FUTURAS', 'TODAS'] as const;
export type EscopoRecorrencia = (typeof ESCOPOS_RECORRENCIA)[number];

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

// RN-09/issue #72: se informado (e sem contaId), a movimentacao se liga
// DIRETO ao grupo, sem uma Conta — mesmo padrao de contas.validador.ts.
const contaCompartilhadaIdSchema = z.string().min(1).nullish();

// RF-27: exclusividade entre fimEm/totalOcorrencias (RN nao numerada
// explicitamente, mas 04-API.md §12.2) e verificada no servico, nao aqui —
// o contrato exige 422 REGRA_NEGOCIO, nao 400 VALIDACAO.
const recorrenciaSchema = z.object({
  frequencia: z.enum(FREQUENCIAS_RECORRENCIA),
  intervalo: z.number().int().min(1).max(12).optional().default(1),
  fimEm: dataIsoSchema.optional(),
  totalOcorrencias: z.number().int().min(2).max(360).optional(),
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
      // RN-09: contaId (pessoal ou sub-conta de grupo) XOR contaCompartilhadaId
      // (grupo, ligacao direta, sem Conta) — checado no superRefine abaixo.
      contaId: z.string().min(1).optional(),
      contaCompartilhadaId: contaCompartilhadaIdSchema,
      cartaoId: cartaoIdSchema,
      categoriaId: z.string().min(1, 'Informe a categoria.'),
      etiquetaIds: z.array(z.string().min(1)).max(10, 'Maximo de 10 etiquetas.').optional(),
      recorrencia: recorrenciaSchema.optional(),
    })
    .superRefine((dados, ctx) => {
      // RN-09: exatamente um dos dois — nunca os dois, nunca nenhum.
      const temConta = dados.contaId !== undefined;
      const temGrupo =
        dados.contaCompartilhadaId !== undefined && dados.contaCompartilhadaId !== null;
      if (temConta === temGrupo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contaId'],
          message: 'Informe contaId ou contaCompartilhadaId, nunca os dois nem nenhum.',
        });
      }

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

// RN-20: obrigatorio quando a movimentacao pertence a uma recorrencia —
// verificado no servico, igual escopoEdicao.
export const excluirMovimentacaoSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  query: z.object({
    escopoExclusao: z.enum(ESCOPOS_RECORRENCIA).optional(),
  }),
});

export type ExcluirMovimentacaoQuery = z.infer<typeof excluirMovimentacaoSchema>['query'];

// ═══════════════════════════════════════════════════════════
//  EDICAO, EXCLUSAO E DUPLICACAO (issue #36)
// ═══════════════════════════════════════════════════════════

// contaId/contaCompartilhadaId/cartaoId sao aceitos aqui (nao removidos
// pelo Zod) so para o servico poder detectar a tentativa e responder
// 422 REGRA_NEGOCIO — mudar de conta e excluir e recriar (04-API.md §12.3).
export const atualizarMovimentacaoSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    tipo: z.enum(TIPOS_MOVIMENTACAO_ACEITOS).optional(),
    descricao: z
      .string()
      .trim()
      .min(2, 'A descricao deve ter no minimo 2 caracteres.')
      .max(200)
      .optional(),
    observacao: z.string().trim().max(1000).optional(),
    valor: valorPositivoSchema.optional(),
    dataCompetencia: dataCompetenciaSchema.optional(),
    dataVencimento: dataIsoSchema.optional(),
    categoriaId: z.string().min(1, 'Informe a categoria.').optional(),
    etiquetaIds: z.array(z.string().min(1)).max(10, 'Maximo de 10 etiquetas.').optional(),
    contaId: z.unknown().optional(),
    contaCompartilhadaId: z.unknown().optional(),
    cartaoId: z.unknown().optional(),
    // RN-19: obrigatorio quando a movimentacao pertence a uma recorrencia —
    // verificado no servico (depende do registro em banco), nao aqui.
    escopoEdicao: z.enum(ESCOPOS_RECORRENCIA).optional(),
  }),
});

export type AtualizarMovimentacaoDTO = z.infer<typeof atualizarMovimentacaoSchema>['body'];

export const duplicarMovimentacaoSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    dataCompetencia: dataCompetenciaSchema.optional(),
    situacao: z.enum(SITUACOES).optional(),
  }),
});

export type DuplicarMovimentacaoDTO = z.infer<typeof duplicarMovimentacaoSchema>['body'];

// ═══════════════════════════════════════════════════════════
//  LISTAGEM (issue #35)
// ═══════════════════════════════════════════════════════════

const TIPOS_MOVIMENTACAO_TODOS = ['RECEITA', 'DESPESA', 'TRANSFERENCIA'] as const;
const CAMPOS_DATA = ['COMPETENCIA', 'VENCIMENTO', 'EFETIVACAO'] as const;
const CAMPOS_ORDENACAO_MOVIMENTACAO = [
  'dataCompetencia',
  'dataVencimento',
  'valor',
  'descricao',
  'criadoEm',
] as const;

function paraArray<T extends string>(valor: T | T[] | undefined): T[] | undefined {
  if (valor === undefined) return undefined;
  return Array.isArray(valor) ? valor : [valor];
}

const booleanoQuerySchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((valor) => (valor === undefined ? undefined : valor === 'true'));

export const listarMovimentacoesSchema = z.object({
  query: z.object({
    dataInicio: dataIsoSchema.optional(),
    dataFim: dataIsoSchema.optional(),
    campoData: z.enum(CAMPOS_DATA).optional().default('COMPETENCIA'),
    tipo: z
      .union([z.enum(TIPOS_MOVIMENTACAO_TODOS), z.array(z.enum(TIPOS_MOVIMENTACAO_TODOS))])
      .optional()
      .transform(paraArray),
    situacao: z
      .union([z.enum(SITUACOES), z.array(z.enum(SITUACOES))])
      .optional()
      .transform(paraArray),
    contaId: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform(paraArray),
    categoriaId: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform(paraArray),
    etiquetaId: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform(paraArray),
    cartaoId: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform(paraArray),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
    valorMinimo: valorDecimalSchema.optional(),
    valorMaximo: valorDecimalSchema.optional(),
    busca: z.string().trim().min(2, 'A busca deve ter no minimo 2 caracteres.').optional(),
    apenasRecorrentes: booleanoQuerySchema,
    apenasParceladas: booleanoQuerySchema,
    pagina: z.coerce
      .number()
      .int('Pagina invalida.')
      .min(1, 'Pagina invalida.')
      .optional()
      .default(1),
    limite: z.coerce
      .number()
      .int('Limite invalido.')
      .min(1, 'Limite invalido.')
      .max(100, 'O limite maximo e 100.')
      .optional()
      .default(20),
    ordenarPor: z.enum(CAMPOS_ORDENACAO_MOVIMENTACAO).optional().default('dataCompetencia'),
    ordem: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export type ListarMovimentacoesQuery = z.infer<typeof listarMovimentacoesSchema>['query'];

// ═══════════════════════════════════════════════════════════
//  PAGAMENTO E ESTORNO (issue #37)
// ═══════════════════════════════════════════════════════════

// contaId: so relevante para despesa de cartao (M8) — aceito e ignorado por
// ora, mesmo padrao de cartaoIdSchema acima.
export const pagarMovimentacaoSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    dataEfetivacao: dataIsoSchema.optional(),
    valorPago: valorPositivoSchema.optional(),
    contaId: z.unknown().optional(),
  }),
});

export type PagarMovimentacaoDTO = z.infer<typeof pagarMovimentacaoSchema>['body'];

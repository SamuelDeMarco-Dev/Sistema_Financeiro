import { z } from 'zod';

const TIPOS_CONTA = [
  'CARTEIRA',
  'CONTA_CORRENTE',
  'POUPANCA',
  'INVESTIMENTO',
  'DINHEIRO',
  'OUTRO',
] as const;

const CAMPOS_ORDENACAO = ['ordem', 'nome', 'saldoAtual'] as const;

// RN-07/RN-08: mesma forma do exemplo de 09-CLAUDE.md, mas sem a restricao
// de positivo — saldoInicial pode ser negativo (cheque especial).
const valorDecimalSchema = z
  .string()
  .regex(/^-?\d{1,12}(\.\d{1,2})?$/, 'Valor invalido. Use o formato 1234.56.');

const corSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida. Use o formato hex #RRGGBB.');

// M2: contas de grupo chegam em M6 — o campo e aceito no corpo (contrato
// futuro de 04-API.md §9.3) mas rejeitado explicitamente enquanto nao
// houver como cria-las de verdade.
const contaCompartilhadaIdSchema = z
  .unknown()
  .optional()
  .refine((valor) => valor === undefined || valor === null, {
    message: 'Contas de grupo ainda nao sao suportadas nesta versao.',
  });

function paraArray<T extends string>(valor: T | T[] | undefined): T[] | undefined {
  if (valor === undefined) return undefined;
  return Array.isArray(valor) ? valor : [valor];
}

export const listarContasSchema = z.object({
  query: z.object({
    tipo: z
      .union([z.enum(TIPOS_CONTA), z.array(z.enum(TIPOS_CONTA))])
      .optional()
      .transform(paraArray),
    incluirArquivadas: z
      .enum(['true', 'false'])
      .optional()
      .default('false')
      .transform((valor) => valor === 'true'),
    ordenarPor: z.enum(CAMPOS_ORDENACAO).optional().default('ordem'),
    ordem: z.enum(['asc', 'desc']).optional().default('asc'),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type ListarContasQuery = z.infer<typeof listarContasSchema>['query'];

export const criarContaSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120),
    tipo: z.enum(TIPOS_CONTA),
    instituicao: z.string().trim().max(120).optional(),
    saldoInicial: valorDecimalSchema.optional().default('0.00'),
    cor: corSchema.optional().default('#2563EB'),
    icone: z.string().trim().min(1).max(40).optional().default('wallet'),
    incluirNoSaldoTotal: z.boolean().optional().default(true),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type CriarContaDTO = z.infer<typeof criarContaSchema>['body'];

export const atualizarContaSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120).optional(),
    tipo: z.enum(TIPOS_CONTA).optional(),
    instituicao: z.string().trim().max(120).optional(),
    saldoInicial: valorDecimalSchema.optional(),
    cor: corSchema.optional(),
    icone: z.string().trim().min(1).max(40).optional(),
    incluirNoSaldoTotal: z.boolean().optional(),
  }),
});

export type AtualizarContaDTO = z.infer<typeof atualizarContaSchema>['body'];

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
});

export type IdParam = z.infer<typeof idParamSchema>['params'];

export const reordenarContasSchema = z.object({
  body: z.object({
    ordens: z
      .array(z.object({ id: z.string().min(1), ordem: z.number().int().min(0) }))
      .min(1, 'Informe ao menos uma conta para reordenar.'),
  }),
});

export type ReordenarContasDTO = z.infer<typeof reordenarContasSchema>['body'];

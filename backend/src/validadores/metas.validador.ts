import { z } from 'zod';
import { ehDataIsoValida, hojeUtc } from '@/utilitarios/data';

const SITUACOES_META = ['ATIVA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA'] as const;

// RN: estritamente positivo, maximo 2 casas — mesmo padrao de
// movimentacoes.validador.ts (valorPositivoSchema).
const valorPositivoSchema = z
  .string()
  .regex(
    /^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/,
    'O valor deve ser maior que zero, com no maximo 2 casas decimais.',
  );

const corSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida. Use o formato hex #RRGGBB.');

const contaCompartilhadaIdSchema = z.string().min(1).nullish();

// RN: prazo deve ser hoje ou no futuro — verificado contra a data do
// servidor (sem timezone de perfil), mesma granularidade grosseira de
// dentroDoLimiteDeCompetencia em movimentacoes.validador.ts.
const prazoEmSchema = z
  .string()
  .refine(ehDataIsoValida, 'Data invalida. Use o formato AAAA-MM-DD.')
  .refine((valor) => {
    const [ano = 0, mes = 0, dia = 0] = valor.split('-').map(Number);
    return Date.UTC(ano, mes - 1, dia) >= hojeUtc().getTime();
  }, 'O prazo deve ser hoje ou uma data futura.')
  .nullish();

export const listarMetasSchema = z.object({
  query: z.object({
    situacao: z
      .union([z.enum(SITUACOES_META), z.array(z.enum(SITUACOES_META))])
      .optional()
      .default('ATIVA')
      .transform((valor) => (Array.isArray(valor) ? valor : [valor])),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type ListarMetasQuery = z.infer<typeof listarMetasSchema>['query'];

export const criarMetaSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120),
    descricao: z.string().trim().max(500).nullish(),
    valorAlvo: valorPositivoSchema,
    prazoEm: prazoEmSchema,
    cor: corSchema.optional().default('#16A34A'),
    icone: z.string().trim().min(1).max(40).optional().default('target'),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type CriarMetaDTO = z.infer<typeof criarMetaSchema>['body'];

export const atualizarMetaSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120).optional(),
    descricao: z.string().trim().max(500).nullish(),
    valorAlvo: valorPositivoSchema.optional(),
    prazoEm: prazoEmSchema,
    cor: corSchema.optional(),
    icone: z.string().trim().min(1).max(40).optional(),
  }),
});

export type AtualizarMetaDTO = z.infer<typeof atualizarMetaSchema>['body'];

export const idParamMetaSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
});

export type IdParamMeta = z.infer<typeof idParamMetaSchema>['params'];

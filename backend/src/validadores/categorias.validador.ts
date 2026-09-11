import { z } from 'zod';

const TIPOS_CATEGORIA = ['RECEITA', 'DESPESA', 'AMBOS'] as const;

const corSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida. Use o formato hex #RRGGBB.');

// 04-API.md §10.2 (issue #72): se informado, cria/lista categoria de
// grupo — requer papel ADMINISTRADOR na criacao (RN-30: "gerenciar
// categorias do grupo"), qualquer membro ativo na leitura.
const contaCompartilhadaIdSchema = z.string().min(1).nullish();

export const listarCategoriasSchema = z.object({
  query: z.object({
    tipo: z.enum(TIPOS_CATEGORIA).optional(),
    apenasRaiz: z
      .enum(['true', 'false'])
      .optional()
      .default('false')
      .transform((valor) => valor === 'true'),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type ListarCategoriasQuery = z.infer<typeof listarCategoriasSchema>['query'];

export const criarCategoriaSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(80),
    tipo: z.enum(TIPOS_CATEGORIA),
    cor: corSchema.optional().default('#64748B'),
    icone: z.string().trim().min(1).max(40).optional().default('tag'),
    categoriaPaiId: z.string().min(1).nullable().optional().default(null),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type CriarCategoriaDTO = z.infer<typeof criarCategoriaSchema>['body'];

export const atualizarCategoriaSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(80).optional(),
    tipo: z.enum(TIPOS_CATEGORIA).optional(),
    cor: corSchema.optional(),
    icone: z.string().trim().min(1).max(40).optional(),
  }),
});

export type AtualizarCategoriaDTO = z.infer<typeof atualizarCategoriaSchema>['body'];

export const idParamCategoriaSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
});

export type IdParamCategoria = z.infer<typeof idParamCategoriaSchema>['params'];

export const excluirCategoriaSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  query: z.object({ recategorizarPara: z.string().min(1).optional() }),
});

export type ExcluirCategoriaQuery = z.infer<typeof excluirCategoriaSchema>['query'];

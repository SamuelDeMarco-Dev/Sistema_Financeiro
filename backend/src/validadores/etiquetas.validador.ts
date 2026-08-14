import { z } from 'zod';

const corSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida. Use o formato hex #RRGGBB.');

// RF-33: nome normalizado para minusculas — "Viagem" e "viagem" sao a
// mesma etiqueta (unicidade case-insensitive garantida pelo indice
// parcial do banco, mas a normalizacao aqui evita duas grafias distintas
// convivendo por acaso ate a primeira colisao).
const nomeEtiquetaSchema = z
  .string()
  .trim()
  .min(1, 'O nome deve ter no minimo 1 caractere.')
  .max(40, 'O nome deve ter no maximo 40 caracteres.')
  .transform((valor) => valor.toLowerCase());

// 04-API.md §11.2 (issue #72): se informado, cria/lista etiqueta de
// grupo — requer papel ADMINISTRADOR ou PARTICIPANTE (mesmo requisito de
// criar movimentacao, RN-30), qualquer membro ativo na leitura.
const contaCompartilhadaIdSchema = z.string().min(1).nullish();

export const criarEtiquetaSchema = z.object({
  body: z.object({
    nome: nomeEtiquetaSchema,
    cor: corSchema.optional().default('#64748B'),
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type CriarEtiquetaDTO = z.infer<typeof criarEtiquetaSchema>['body'];

export const listarEtiquetasSchema = z.object({
  query: z.object({
    contaCompartilhadaId: contaCompartilhadaIdSchema,
  }),
});

export type ListarEtiquetasQuery = z.infer<typeof listarEtiquetasSchema>['query'];

export const atualizarEtiquetaSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    nome: nomeEtiquetaSchema.optional(),
    cor: corSchema.optional(),
  }),
});

export type AtualizarEtiquetaDTO = z.infer<typeof atualizarEtiquetaSchema>['body'];

export const idParamEtiquetaSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
});

export type IdParamEtiqueta = z.infer<typeof idParamEtiquetaSchema>['params'];

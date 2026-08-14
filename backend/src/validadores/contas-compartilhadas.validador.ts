import { z } from 'zod';

const PAPEIS_MEMBRO = ['ADMINISTRADOR', 'PARTICIPANTE', 'OBSERVADOR'] as const;

const corSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida. Use o formato hex #RRGGBB.');

export const idParamSchema = z.object({
  params: z.object({ contaCompartilhadaId: z.string().min(1, 'Id invalido.') }),
});

export type IdParam = z.infer<typeof idParamSchema>['params'];

export const criarContaCompartilhadaSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120),
    descricao: z.string().trim().max(500).optional(),
    moeda: z
      .string()
      .trim()
      .length(3, 'Moeda deve ter 3 letras (ex.: BRL).')
      .optional()
      .default('BRL'),
    cor: corSchema.optional().default('#2563EB'),
    permiteParticipanteEditarProprias: z.boolean().optional().default(true),
    criarCategoriasPadrao: z.boolean().optional().default(true),
  }),
});

export type CriarContaCompartilhadaDTO = z.infer<typeof criarContaCompartilhadaSchema>['body'];

export const atualizarContaCompartilhadaSchema = z.object({
  params: z.object({ contaCompartilhadaId: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120).optional(),
    descricao: z.string().trim().max(500).nullable().optional(),
    cor: corSchema.optional(),
    permiteParticipanteEditarProprias: z.boolean().optional(),
  }),
});

export type AtualizarContaCompartilhadaDTO = z.infer<
  typeof atualizarContaCompartilhadaSchema
>['body'];

export const excluirContaCompartilhadaSchema = z.object({
  params: z.object({ contaCompartilhadaId: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    confirmacao: z.string().trim().min(1, 'Informe o nome do grupo para confirmar a exclusao.'),
  }),
});

export type ExcluirContaCompartilhadaDTO = z.infer<typeof excluirContaCompartilhadaSchema>['body'];

export const membroIdParamSchema = z.object({
  params: z.object({
    contaCompartilhadaId: z.string().min(1, 'Id invalido.'),
    membroId: z.string().min(1, 'Id de membro invalido.'),
  }),
});

export type MembroIdParam = z.infer<typeof membroIdParamSchema>['params'];

// ADMINISTRADOR entra no schema para o servico poder recusa-lo com 422
// REGRA_NEGOCIO apontando a rota correta (04-API.md §16.5) — um 400 de
// validacao aqui esconderia essa orientacao.
export const alterarPapelMembroSchema = z.object({
  params: z.object({
    contaCompartilhadaId: z.string().min(1, 'Id invalido.'),
    membroId: z.string().min(1, 'Id de membro invalido.'),
  }),
  body: z.object({ papel: z.enum(PAPEIS_MEMBRO) }),
});

export type AlterarPapelMembroDTO = z.infer<typeof alterarPapelMembroSchema>['body'];

export const transferirAdministracaoSchema = z.object({
  params: z.object({ contaCompartilhadaId: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    novoAdministradorMembroId: z.string().min(1, 'Informe o novo administrador.'),
  }),
});

export type TransferirAdministracaoDTO = z.infer<typeof transferirAdministracaoSchema>['body'];

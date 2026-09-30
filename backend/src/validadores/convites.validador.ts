import { z } from 'zod';

// ADMINISTRADOR nunca e um papel convidavel — RN-28 so admite exatamente
// um administrador, promovido via transferir-administracao (issue #69),
// nunca por convite direto.
const PAPEIS_CONVIDAVEIS = ['PARTICIPANTE', 'OBSERVADOR'] as const;

export const enviarConviteSchema = z.object({
  params: z.object({ contaCompartilhadaId: z.string().min(1, 'Id invalido.') }),
  body: z.object({
    email: z.string().trim().email('E-mail invalido.'),
    papel: z.enum(PAPEIS_CONVIDAVEIS),
    mensagem: z.string().trim().max(300).optional(),
  }),
});

export type EnviarConviteDTO = z.infer<typeof enviarConviteSchema>['body'];

export const conviteIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
});

export type ConviteIdParam = z.infer<typeof conviteIdParamSchema>['params'];

export const tokenConviteParamSchema = z.object({
  params: z.object({ token: z.string().min(1, 'Token invalido.') }),
});

export type TokenConviteParam = z.infer<typeof tokenConviteParamSchema>['params'];

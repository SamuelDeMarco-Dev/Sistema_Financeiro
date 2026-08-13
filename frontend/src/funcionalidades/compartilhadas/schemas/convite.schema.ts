import { z } from 'zod';
import { PAPEIS_CONVIDAVEIS } from '../tipos/conta-compartilhada';

/** Espelha `enviarConviteSchema` do backend (04-API.md §17.1). O papel e'
 * restrito a PARTICIPANTE/OBSERVADOR: RN-28 admite exatamente um
 * administrador, e ele muda so por transferencia. */
export const conviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail de quem voce quer convidar.')
    .email('E-mail invalido.'),
  papel: z.enum(PAPEIS_CONVIDAVEIS),
  mensagem: z
    .string()
    .trim()
    .max(300, 'A mensagem deve ter no maximo 300 caracteres.')
    .optional()
    .transform((valor) => (valor === '' ? undefined : valor)),
});

export type ConviteFormulario = z.infer<typeof conviteSchema>;

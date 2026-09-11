import { z } from 'zod';
import { TIPOS_CONTA } from '@/constantes/tipos-conta';

// Aceita virgula (convencao pt-BR) ou ponto e normaliza para o formato
// decimal da API ("1234.56") antes de enviar — RN-07/RN-08 no backend.
const valorMonetarioSchema = z
  .string()
  .trim()
  .min(1, 'Informe o saldo inicial.')
  .transform((valor) => valor.replace(',', '.'))
  .refine((valor) => /^-?\d{1,12}(\.\d{1,2})?$/.test(valor), {
    message: 'Use o formato 1234.56 ou 1234,56.',
  });

export const contaSchema = z.object({
  nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120),
  tipo: z.enum(TIPOS_CONTA),
  instituicao: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((valor) => (valor === '' ? undefined : valor)),
  saldoInicial: valorMonetarioSchema,
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida.'),
  icone: z.string().trim().min(1, 'Escolha um icone.'),
  incluirNoSaldoTotal: z.boolean(),
});

export type ContaFormulario = z.infer<typeof contaSchema>;

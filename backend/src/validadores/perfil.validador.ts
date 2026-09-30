import { z } from 'zod';

const FUSOS_VALIDOS = new Set(Intl.supportedValuesOf('timeZone'));

// Usa a propria validacao de moeda do Intl (ISO 4217) em vez de manter uma
// lista de codigos que ficaria desatualizada.
function moedaValida(codigo: string): boolean {
  try {
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: codigo });
    return true;
  } catch {
    return false;
  }
}

export const atualizarPerfilSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(3, 'O nome deve ter no minimo 3 caracteres.').max(120).optional(),
    tema: z.enum(['CLARO', 'ESCURO', 'SISTEMA']).optional(),
    timezone: z
      .string()
      .refine((tz) => FUSOS_VALIDOS.has(tz), 'Timezone invalido.')
      .optional(),
    moedaPadrao: z
      .string()
      .length(3, 'Use o codigo ISO 4217 (3 letras), ex.: BRL.')
      .transform((codigo) => codigo.toUpperCase())
      .refine(moedaValida, 'Moeda invalida.')
      .optional(),
    idioma: z.string().trim().min(2).max(10).optional(),
    formatoData: z.string().trim().min(1).max(20).optional(),
    primeiroDiaSemana: z.number().int().min(0).max(6).optional(),
    notificacoesApp: z.boolean().optional(),
    notificacoesEmail: z.boolean().optional(),
    // 04-API.md §8.2: email nao e alteravel por esta rota — rejeita
    // explicitamente em vez de ignorar em silencio.
    email: z
      .unknown()
      .optional()
      .refine((valor) => valor === undefined, {
        message: 'E-mail nao pode ser alterado por esta rota.',
      }),
  }),
});

export type AtualizarPerfilDTO = z.infer<typeof atualizarPerfilSchema>['body'];

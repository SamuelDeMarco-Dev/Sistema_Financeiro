import { z } from 'zod';

// Espelha backend/src/validadores/perfil.validador.ts — mesma logica
// (Intl em vez de lista hardcoded) para o feedback do formulario bater com
// a validacao que de fato manda, no PATCH /perfil.
const FUSOS_VALIDOS = new Set(Intl.supportedValuesOf('timeZone'));

function moedaValida(codigo: string): boolean {
  try {
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: codigo });
    return true;
  } catch {
    return false;
  }
}

// Dividido em dois schemas (nao um so) porque a pagina de configuracoes
// salva por secao (aba Perfil x aba Preferencias), cada uma com seu
// proprio botao e estado de carregamento — issue #21.
export const perfilNomeSchema = z.object({
  nome: z.string().trim().min(3, 'O nome deve ter no minimo 3 caracteres.').max(120),
});

export type PerfilNomeFormulario = z.infer<typeof perfilNomeSchema>;

export const preferenciasSchema = z.object({
  tema: z.enum(['CLARO', 'ESCURO', 'SISTEMA']),
  idioma: z.string().trim().min(2).max(10),
  moedaPadrao: z
    .string()
    .length(3, 'Use o codigo ISO 4217 (3 letras), ex.: BRL.')
    .transform((codigo) => codigo.toUpperCase())
    .refine(moedaValida, 'Moeda invalida.'),
  timezone: z.string().refine((tz) => FUSOS_VALIDOS.has(tz), 'Timezone invalido.'),
  formatoData: z.string().trim().min(1).max(20),
  primeiroDiaSemana: z.number().int().min(0).max(6),
  notificacoesApp: z.boolean(),
  notificacoesEmail: z.boolean(),
});

export type PreferenciasFormulario = z.infer<typeof preferenciasSchema>;

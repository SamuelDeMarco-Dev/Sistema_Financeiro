import { z } from 'zod';

export const grupoSchema = z.object({
  nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120),
  descricao: z
    .string()
    .trim()
    .max(500, 'A descricao deve ter no maximo 500 caracteres.')
    .optional()
    .transform((valor) => (valor === '' ? undefined : valor)),
  // A API aceita qualquer codigo de 3 letras (04-API.md §16.2); o formulario
  // oferece uma lista curta, mas a validacao acompanha a do servidor.
  moeda: z
    .string()
    .trim()
    .length(3, 'Use o codigo de 3 letras da moeda (ex.: BRL).')
    .transform((valor) => valor.toUpperCase()),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida.'),
  permiteParticipanteEditarProprias: z.boolean(),
  criarCategoriasPadrao: z.boolean(),
});

export type GrupoFormulario = z.infer<typeof grupoSchema>;

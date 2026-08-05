import { z } from 'zod';
import { TIPOS_CATEGORIA } from '../tipos/categoria';

const corSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida. Use o formato hex #RRGGBB.');

export const categoriaSchema = z.object({
  nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(80),
  tipo: z.enum(TIPOS_CATEGORIA),
  cor: corSchema,
  icone: z.string().trim().min(1, 'Escolha um icone.'),
  categoriaPaiId: z.string().nullable(),
});

export type CategoriaFormulario = z.infer<typeof categoriaSchema>;

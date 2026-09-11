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

/** Edicao (04-API.md §16.4) difere da criacao em dois pontos: a moeda nao
 * e' editavel — o grupo ja tem lancamentos gravados nela — e a descricao
 * apagada vira `null`, nao `undefined`, porque o PATCH so limpa o campo
 * com um `null` explicito. */
export const edicaoGrupoSchema = z.object({
  nome: z.string().trim().min(2, 'O nome deve ter no minimo 2 caracteres.').max(120),
  // `nullable()` mantem entrada e saida do schema com o mesmo tipo
  // (`string | null`), o que o react-hook-form exige do formulario que o
  // resolve — e o campo vazio ainda chega ao PATCH como `null`.
  descricao: z
    .string()
    .trim()
    .max(500, 'A descricao deve ter no maximo 500 caracteres.')
    .nullable()
    .transform((valor) => (valor === '' ? null : valor)),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida.'),
  permiteParticipanteEditarProprias: z.boolean(),
});

export type EdicaoGrupoFormulario = z.infer<typeof edicaoGrupoSchema>;

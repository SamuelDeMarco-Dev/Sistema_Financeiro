import { z } from 'zod';

export const enviarAnexoSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
});

export type IdParamMovimentacaoAnexo = z.infer<typeof enviarAnexoSchema>['params'];

export const idAnexoSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Id invalido.') }),
});

export type IdAnexoParam = z.infer<typeof idAnexoSchema>['params'];

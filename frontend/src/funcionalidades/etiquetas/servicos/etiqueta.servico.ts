import { api } from '@/servicos/api';
import type { Etiqueta } from '../tipos/etiqueta';

export interface CriarEtiquetaPayload {
  nome: string;
  cor?: string | undefined;
}

export async function listarEtiquetas(): Promise<Etiqueta[]> {
  const resposta = await api.get<{ data: { etiquetas: Etiqueta[] } }>('/etiquetas');
  return resposta.data.data.etiquetas;
}

export async function criarEtiqueta(dados: CriarEtiquetaPayload): Promise<Etiqueta> {
  const resposta = await api.post<{ data: { etiqueta: Etiqueta } }>('/etiquetas', dados);
  return resposta.data.data.etiqueta;
}

import { api } from '@/servicos/api';
import type { Etiqueta } from '../tipos/etiqueta';

export interface FiltrosListarEtiquetas {
  /** 04-API.md §11.4: escopo de grupo. Ausente ⇒ escopo pessoal. */
  contaCompartilhadaId?: string;
}

export interface CriarEtiquetaPayload {
  nome: string;
  cor?: string | undefined;
  contaCompartilhadaId?: string | undefined;
}

export async function listarEtiquetas(filtros: FiltrosListarEtiquetas = {}): Promise<Etiqueta[]> {
  const resposta = await api.get<{ data: { etiquetas: Etiqueta[] } }>('/etiquetas', {
    params: filtros,
  });
  return resposta.data.data.etiquetas;
}

export async function criarEtiqueta(dados: CriarEtiquetaPayload): Promise<Etiqueta> {
  const resposta = await api.post<{ data: { etiqueta: Etiqueta } }>('/etiquetas', dados);
  return resposta.data.data.etiqueta;
}

import type { RespostaSucesso } from '@/tipos/api';
import type { PerfilCompleto } from '@/tipos/perfil';
import { api } from './api';

// Espelha o corpo aceito por PATCH /perfil (04-API.md §8.2) — todos os
// campos opcionais, `email` de fora de proposito (nao alteravel por esta rota).
export type AtualizarPerfilPayload = Partial<
  Pick<
    PerfilCompleto,
    | 'nome'
    | 'tema'
    | 'timezone'
    | 'moedaPadrao'
    | 'idioma'
    | 'formatoData'
    | 'primeiroDiaSemana'
    | 'notificacoesApp'
    | 'notificacoesEmail'
  >
>;

export async function consultarPerfil(): Promise<PerfilCompleto> {
  const resposta = await api.get<RespostaSucesso<{ perfil: PerfilCompleto }>>('/perfil');
  return resposta.data.data.perfil;
}

export async function atualizarPerfil(dados: AtualizarPerfilPayload): Promise<PerfilCompleto> {
  const resposta = await api.patch<RespostaSucesso<{ perfil: PerfilCompleto }>>('/perfil', dados);
  return resposta.data.data.perfil;
}

// multipart/form-data, campo `foto` (04-API.md §8.3) — JPEG/PNG/WebP, max 2MB.
export async function atualizarFoto(arquivo: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('foto', arquivo, 'avatar.webp');
  const resposta = await api.post<RespostaSucesso<{ fotoUrl: string }>>('/perfil/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resposta.data.data.fotoUrl;
}

export async function removerFoto(): Promise<void> {
  await api.delete('/perfil/foto');
}

import type { RespostaSucesso } from '@/tipos/api';
import type { PerfilCompleto } from '@/tipos/perfil';
import { api } from './api';

export async function consultarPerfil(): Promise<PerfilCompleto> {
  const resposta = await api.get<RespostaSucesso<{ perfil: PerfilCompleto }>>('/perfil');
  return resposta.data.data.perfil;
}

import { api } from '@/servicos/api';
import type { RespostaSucesso } from '@/tipos/api';
import type { ConviteRecebido, MembroAceito } from '../tipos/convite';

export async function listarConvitesRecebidos(): Promise<ConviteRecebido[]> {
  const resposta =
    await api.get<RespostaSucesso<{ convites: ConviteRecebido[] }>>('/convites/recebidos');
  return resposta.data.data.convites;
}

export async function aceitarConvite(id: string): Promise<MembroAceito> {
  const resposta = await api.post<RespostaSucesso<{ membro: MembroAceito }>>(
    `/convites/${id}/aceitar`,
  );
  return resposta.data.data.membro;
}

export async function recusarConvite(id: string): Promise<void> {
  await api.post(`/convites/${id}/recusar`);
}

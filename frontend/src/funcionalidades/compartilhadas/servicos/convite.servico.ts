import { api } from '@/servicos/api';
import type { RespostaSucesso } from '@/tipos/api';
import type { PapelConvidavel } from '../tipos/conta-compartilhada';
import type {
  ConviteDoGrupo,
  ConviteEnviado,
  ConvitePrevia,
  ConviteRecebido,
  MembroAceito,
} from '../tipos/convite';

export interface EnviarConvitePayload {
  email: string;
  papel: PapelConvidavel;
  mensagem?: string | undefined;
}

export async function listarConvitesDoGrupo(
  contaCompartilhadaId: string,
): Promise<ConviteDoGrupo[]> {
  const resposta = await api.get<RespostaSucesso<{ convites: ConviteDoGrupo[] }>>(
    `/contas-compartilhadas/${contaCompartilhadaId}/convites`,
  );
  return resposta.data.data.convites;
}

export async function enviarConvite(
  contaCompartilhadaId: string,
  dados: EnviarConvitePayload,
): Promise<ConviteEnviado> {
  const resposta = await api.post<RespostaSucesso<{ convite: ConviteEnviado }>>(
    `/contas-compartilhadas/${contaCompartilhadaId}/convites`,
    dados,
  );
  return resposta.data.data.convite;
}

/** Cancelamento pelo administrador (04-API.md §17.5) — marca `CANCELADO`.
 * Nao e' o mesmo que `recusar`, que e' a resposta do convidado. */
export async function cancelarConvite(id: string): Promise<void> {
  await api.delete(`/convites/${id}`);
}

/** Rota publica: nao exige sessao. Um token invalido, expirado ou de
 * convite inexistente responde 404 — sem distinguir os casos, para o link
 * nao servir de sonda. */
export async function buscarPreviaConvite(token: string): Promise<ConvitePrevia> {
  const resposta = await api.get<RespostaSucesso<{ convite: ConvitePrevia }>>(
    `/convites/token/${token}`,
  );
  return resposta.data.data.convite;
}

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

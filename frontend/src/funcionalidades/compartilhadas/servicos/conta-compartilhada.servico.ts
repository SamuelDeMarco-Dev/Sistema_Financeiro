import { api } from '@/servicos/api';
import type { RespostaSucesso } from '@/tipos/api';
import type {
  ContaCompartilhadaDetalhe,
  ContaCompartilhadaListaItem,
  MembroDoGrupo,
  PapelConvidavel,
} from '../tipos/conta-compartilhada';

export interface CriarGrupoPayload {
  nome: string;
  descricao?: string | undefined;
  moeda: string;
  cor: string;
  permiteParticipanteEditarProprias: boolean;
  criarCategoriasPadrao: boolean;
}

/** 04-API.md §16.4 — PATCH parcial. `descricao: null` limpa a descricao;
 * `undefined` a mantem, e por isso os dois valores precisam ser
 * distinguiveis aqui. Moeda nao esta na rota: o grupo ja tem movimentacoes
 * na moeda escolhida, trocar depois reinterpretaria valores gravados. */
export interface AtualizarGrupoPayload {
  nome?: string | undefined;
  descricao?: string | null | undefined;
  cor?: string | undefined;
  permiteParticipanteEditarProprias?: boolean | undefined;
}

export interface ResultadoTransferencia {
  administradorAnterior: { membroId: string; papel: string };
  novoAdministrador: { membroId: string; papel: string };
}

export async function listarContasCompartilhadas(): Promise<ContaCompartilhadaListaItem[]> {
  const resposta =
    await api.get<RespostaSucesso<{ contasCompartilhadas: ContaCompartilhadaListaItem[] }>>(
      '/contas-compartilhadas',
    );
  return resposta.data.data.contasCompartilhadas;
}

export async function buscarContaCompartilhada(id: string): Promise<ContaCompartilhadaDetalhe> {
  const resposta = await api.get<
    RespostaSucesso<{ contaCompartilhada: ContaCompartilhadaDetalhe }>
  >(`/contas-compartilhadas/${id}`);
  return resposta.data.data.contaCompartilhada;
}

export async function criarContaCompartilhada(
  dados: CriarGrupoPayload,
): Promise<ContaCompartilhadaDetalhe> {
  const resposta = await api.post<
    RespostaSucesso<{ contaCompartilhada: ContaCompartilhadaDetalhe }>
  >('/contas-compartilhadas', dados);
  return resposta.data.data.contaCompartilhada;
}

export async function atualizarContaCompartilhada(
  id: string,
  dados: AtualizarGrupoPayload,
): Promise<ContaCompartilhadaDetalhe> {
  const resposta = await api.patch<
    RespostaSucesso<{ contaCompartilhada: ContaCompartilhadaDetalhe }>
  >(`/contas-compartilhadas/${id}`, dados);
  return resposta.data.data.contaCompartilhada;
}

/** RN-33: exclusao logica, com o nome exato do grupo como confirmacao. O
 * `confirmacao` viaja no corpo de um DELETE — incomum, mas e' o contrato
 * (04-API.md §16.9), e axios exige `{ data }` para envia-lo. */
export async function excluirContaCompartilhada(id: string, confirmacao: string): Promise<void> {
  await api.delete(`/contas-compartilhadas/${id}`, { data: { confirmacao } });
}

export async function alterarPapelMembro(
  id: string,
  membroId: string,
  papel: PapelConvidavel,
): Promise<MembroDoGrupo> {
  const resposta = await api.patch<RespostaSucesso<{ membro: MembroDoGrupo }>>(
    `/contas-compartilhadas/${id}/membros/${membroId}`,
    { papel },
  );
  return resposta.data.data.membro;
}

/** RN-34: o membro sai marcado como REMOVIDO e as movimentacoes dele
 * continuam no grupo, atribuidas a ele. */
export async function removerMembro(id: string, membroId: string): Promise<void> {
  await api.delete(`/contas-compartilhadas/${id}/membros/${membroId}`);
}

export async function transferirAdministracao(
  id: string,
  novoAdministradorMembroId: string,
): Promise<ResultadoTransferencia> {
  const resposta = await api.post<RespostaSucesso<ResultadoTransferencia>>(
    `/contas-compartilhadas/${id}/transferir-administracao`,
    { novoAdministradorMembroId },
  );
  return resposta.data.data;
}

/** RN-29: o administrador precisa transferir a administracao antes — o
 * servidor responde 422 ADMINISTRADOR_UNICO se ele tentar sair. */
export async function sairDoGrupo(id: string): Promise<void> {
  await api.post(`/contas-compartilhadas/${id}/sair`);
}

/** A imagem viaja em requisicao separada (04-API.md §16 rotas): o grupo
 * nasce em `POST /contas-compartilhadas` e so depois recebe a imagem, ja
 * recortada no cliente para um WebP quadrado. */
export async function atualizarImagemGrupo(id: string, imagem: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('imagem', imagem, 'grupo.webp');
  const resposta = await api.post<RespostaSucesso<{ imagemUrl: string }>>(
    `/contas-compartilhadas/${id}/imagem`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return resposta.data.data.imagemUrl;
}

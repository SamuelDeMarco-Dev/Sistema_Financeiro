import { api } from '@/servicos/api';
import type { RespostaSucesso } from '@/tipos/api';
import type {
  ContaCompartilhadaDetalhe,
  ContaCompartilhadaListaItem,
} from '../tipos/conta-compartilhada';

export interface CriarGrupoPayload {
  nome: string;
  descricao?: string | undefined;
  moeda: string;
  cor: string;
  permiteParticipanteEditarProprias: boolean;
  criarCategoriasPadrao: boolean;
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

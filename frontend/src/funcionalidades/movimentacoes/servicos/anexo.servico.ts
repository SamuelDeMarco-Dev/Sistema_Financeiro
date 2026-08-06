import { api } from '@/servicos/api';
import type { AnexoResumo } from '../tipos/movimentacao';

/** Um arquivo por requisição, mesmo que o backend aceite lote — assim a
 * falha de um arquivo (tipo inválido, limite atingido) nunca desfaz os
 * que já tinham sido aceitos nesta mesma seleção. */
export async function enviarAnexo(
  movimentacaoId: string,
  arquivo: File,
  aoProgredir?: (percentual: number) => void,
): Promise<AnexoResumo> {
  const formData = new FormData();
  formData.append('arquivo', arquivo);

  const resposta = await api.post<{ data: { anexos: AnexoResumo[] } }>(
    `/movimentacoes/${movimentacaoId}/anexos`,
    formData,
    {
      onUploadProgress: (evento) => {
        if (aoProgredir && evento.total) {
          aoProgredir(Math.round((evento.loaded / evento.total) * 100));
        }
      },
    },
  );

  const [anexo] = resposta.data.data.anexos;
  if (!anexo) {
    throw new Error('A resposta do envio não trouxe o anexo criado.');
  }
  return anexo;
}

export async function excluirAnexo(anexoId: string): Promise<void> {
  await api.delete(`/anexos/${anexoId}`);
}

export async function baixarConteudoAnexo(url: string): Promise<Blob> {
  const resposta = await api.get<Blob>(url, { responseType: 'blob' });
  return resposta.data;
}

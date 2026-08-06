import type { Anexo } from '@prisma/client';

export interface AnexoDTO {
  id: string;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  url: string;
  criadoEm: Date;
}

export function mapearAnexo(anexo: Anexo): AnexoDTO {
  return {
    id: anexo.id,
    nomeOriginal: anexo.nomeOriginal,
    tipoMime: anexo.tipoMime,
    tamanhoBytes: anexo.tamanhoBytes,
    url: `/api/v1/anexos/${anexo.id}/conteudo`,
    criadoEm: anexo.criadoEm,
  };
}

import { api } from '@/servicos/api';
import type { Transferencia } from '../tipos/transferencia';

export interface CriarTransferenciaPayload {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: string;
  data: string;
  descricao?: string | undefined;
  observacao?: string | undefined;
  efetivada?: boolean | undefined;
}

export async function criarTransferencia(dados: CriarTransferenciaPayload): Promise<Transferencia> {
  const resposta = await api.post<{ data: { transferencia: Transferencia } }>(
    '/transferencias',
    dados,
  );
  return resposta.data.data.transferencia;
}

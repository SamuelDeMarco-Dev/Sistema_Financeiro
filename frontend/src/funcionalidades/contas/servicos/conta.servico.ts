import type { TipoConta } from '@/constantes/tipos-conta';
import { api } from '@/servicos/api';
import type { Conta, ContaResumo, TotalizadoresContas } from '../tipos/conta';

export interface FiltrosListarContas {
  tipo?: TipoConta[];
  incluirArquivadas?: boolean;
  ordenarPor?: 'ordem' | 'nome' | 'saldoAtual';
  ordem?: 'asc' | 'desc';
}

export interface RespostaListarContas {
  contas: Conta[];
  totalizadores: TotalizadoresContas;
}

interface EnvelopeListarContas {
  data: { contas: Conta[] };
  meta: { totalizadores: TotalizadoresContas };
}

export interface CriarContaPayload {
  nome: string;
  tipo: TipoConta;
  instituicao?: string | undefined;
  saldoInicial: string;
  cor: string;
  icone: string;
  incluirNoSaldoTotal: boolean;
}

export type AtualizarContaPayload = Partial<CriarContaPayload>;

export async function listarContas(
  filtros: FiltrosListarContas = {},
): Promise<RespostaListarContas> {
  const resposta = await api.get<EnvelopeListarContas>('/contas', { params: filtros });
  return { contas: resposta.data.data.contas, totalizadores: resposta.data.meta.totalizadores };
}

export async function listarResumoContas(): Promise<ContaResumo[]> {
  const resposta = await api.get<{ data: { contas: ContaResumo[] } }>('/contas/resumo');
  return resposta.data.data.contas;
}

export async function criarConta(dados: CriarContaPayload): Promise<Conta> {
  const resposta = await api.post<{ data: { conta: Conta } }>('/contas', dados);
  return resposta.data.data.conta;
}

export async function atualizarConta(id: string, dados: AtualizarContaPayload): Promise<Conta> {
  const resposta = await api.patch<{ data: { conta: Conta } }>(`/contas/${id}`, dados);
  return resposta.data.data.conta;
}

export async function arquivarConta(id: string): Promise<Conta> {
  const resposta = await api.patch<{ data: { conta: Conta } }>(`/contas/${id}/arquivar`);
  return resposta.data.data.conta;
}

export async function desarquivarConta(id: string): Promise<Conta> {
  const resposta = await api.patch<{ data: { conta: Conta } }>(`/contas/${id}/desarquivar`);
  return resposta.data.data.conta;
}

export async function reordenarContas(ordens: { id: string; ordem: number }[]): Promise<void> {
  await api.patch('/contas/reordenar', { ordens });
}

export async function excluirConta(id: string): Promise<void> {
  await api.delete(`/contas/${id}`);
}

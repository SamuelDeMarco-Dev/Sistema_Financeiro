import { Prisma } from '@prisma/client';
import { TransferenciaRepositorio } from '@/repositorios/transferencia.repositorio';
import { deDataIso } from '@/utilitarios/data';

const repositorio = new TransferenciaRepositorio();

export interface SobrescritasTransferencia {
  valor?: Prisma.Decimal.Value;
  data?: string;
  descricao?: string;
  observacao?: string | null;
  efetivada?: boolean;
}

/** Cria o par SAIDA/ENTRADA direto no banco (mesma transação de
 * `TransferenciaRepositorio.criar`) — usada para montar estado inicial
 * de testes de invariante sem o custo de uma requisição HTTP por item. */
export async function fabricarTransferencia(
  usuarioId: string,
  contaOrigemId: string,
  contaDestinoId: string,
  sobrescritas: SobrescritasTransferencia = {},
): Promise<string> {
  return repositorio.criar({
    usuarioId,
    contaOrigemId,
    contaDestinoId,
    valor: new Prisma.Decimal(sobrescritas.valor ?? '100.00'),
    data: deDataIso(sobrescritas.data ?? '2026-08-01'),
    descricao: sobrescritas.descricao ?? `${contaOrigemId} → ${contaDestinoId}`,
    observacao: sobrescritas.observacao ?? null,
    efetivada: sobrescritas.efetivada ?? true,
  });
}

export interface PernaTransferencia {
  movimentacaoId: string;
  conta: { id: string; nome: string; saldoAtual: string };
}

export interface Transferencia {
  transferenciaId: string;
  valor: string;
  data: string;
  descricao: string;
  situacao: string;
  saida: PernaTransferencia;
  entrada: PernaTransferencia;
}

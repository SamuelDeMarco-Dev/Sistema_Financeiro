export const TIPOS_CONTA = [
  'CARTEIRA',
  'CONTA_CORRENTE',
  'POUPANCA',
  'INVESTIMENTO',
  'DINHEIRO',
  'OUTRO',
] as const;

export type TipoConta = (typeof TIPOS_CONTA)[number];

export const ROTULO_TIPO_CONTA: Record<TipoConta, string> = {
  CARTEIRA: 'Carteira',
  CONTA_CORRENTE: 'Conta corrente',
  POUPANCA: 'Poupança',
  INVESTIMENTO: 'Investimento',
  DINHEIRO: 'Dinheiro',
  OUTRO: 'Outro',
};

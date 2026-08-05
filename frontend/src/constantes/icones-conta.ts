import {
  Banknote,
  Briefcase,
  Building2,
  Coins,
  CreditCard,
  Landmark,
  PiggyBank,
  Smartphone,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Conjunto curado para o seletor de icones de conta (issue #28). O backend
// aceita qualquer string de 1-40 caracteres — este mapa cobre as opcoes
// oferecidas na UI e serve de fallback para nomes fora dele.
export const ICONES_CONTA: Record<string, LucideIcon> = {
  wallet: Wallet,
  landmark: Landmark,
  banknote: Banknote,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  'trending-up': TrendingUp,
  coins: Coins,
  'building-2': Building2,
  smartphone: Smartphone,
  briefcase: Briefcase,
};

export const ICONE_CONTA_PADRAO: LucideIcon = Wallet;

export function resolverIconeConta(nome: string): LucideIcon {
  return ICONES_CONTA[nome] ?? ICONE_CONTA_PADRAO;
}

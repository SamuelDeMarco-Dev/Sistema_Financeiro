import type { TipoCategoria } from '@prisma/client';

export interface CategoriaPadraoSistema {
  nome: string;
  tipo: TipoCategoria;
  cor: string;
  icone: string;
  /** Nomes das subcategorias, na ordem em que devem aparecer. */
  subcategorias?: string[];
}

/** 03-DATABASE.md §10.1 — as 18 categorias padrao do sistema, copiadas
 * para todo usuario recem-cadastrado (RF-19). */
export const CATEGORIAS_PADRAO_SISTEMA: CategoriaPadraoSistema[] = [
  { nome: 'Salário', tipo: 'RECEITA', cor: '#16A34A', icone: 'banknote' },
  { nome: 'Freelance', tipo: 'RECEITA', cor: '#22C55E', icone: 'laptop' },
  { nome: 'Investimentos', tipo: 'AMBOS', cor: '#7C3AED', icone: 'trending-up' },
  { nome: 'Reembolso', tipo: 'RECEITA', cor: '#14B8A6', icone: 'undo' },
  { nome: 'Outras receitas', tipo: 'RECEITA', cor: '#64748B', icone: 'plus-circle' },
  {
    nome: 'Alimentação',
    tipo: 'DESPESA',
    cor: '#EA580C',
    icone: 'utensils',
    subcategorias: ['Restaurante', 'Delivery', 'Lanche'],
  },
  { nome: 'Mercado', tipo: 'DESPESA', cor: '#F97316', icone: 'shopping-cart' },
  {
    nome: 'Transporte',
    tipo: 'DESPESA',
    cor: '#0EA5E9',
    icone: 'car',
    subcategorias: ['Combustível', 'Aplicativo', 'Transporte público', 'Estacionamento'],
  },
  {
    nome: 'Moradia',
    tipo: 'DESPESA',
    cor: '#8B5CF6',
    icone: 'home',
    subcategorias: ['Aluguel', 'Condomínio', 'Energia', 'Água', 'Internet'],
  },
  { nome: 'Saúde', tipo: 'DESPESA', cor: '#EF4444', icone: 'heart-pulse' },
  { nome: 'Educação', tipo: 'DESPESA', cor: '#3B82F6', icone: 'graduation-cap' },
  { nome: 'Lazer', tipo: 'DESPESA', cor: '#EC4899', icone: 'party-popper' },
  { nome: 'Assinaturas', tipo: 'DESPESA', cor: '#A855F7', icone: 'repeat' },
  { nome: 'Impostos', tipo: 'DESPESA', cor: '#78716C', icone: 'landmark' },
  { nome: 'Vestuário', tipo: 'DESPESA', cor: '#F59E0B', icone: 'shirt' },
  { nome: 'Pets', tipo: 'DESPESA', cor: '#84CC16', icone: 'dog' },
  { nome: 'Presentes', tipo: 'DESPESA', cor: '#F43F5E', icone: 'gift' },
  { nome: 'Outras despesas', tipo: 'DESPESA', cor: '#64748B', icone: 'minus-circle' },
];

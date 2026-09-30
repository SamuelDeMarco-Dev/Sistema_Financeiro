import { paraCentavos } from './dinheiro';

/** Formata a string decimal da API como moeda pt-BR — o sinal de negativo
 * do Intl.NumberFormat ("-R$ 1.234,56") ja cobre A11Y-01 (nunca so a cor). */
export function formatarMoeda(valorApi: string, moeda = 'BRL'): string {
  const centavos = paraCentavos(valorApi);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(
    centavos / 100,
  );
}

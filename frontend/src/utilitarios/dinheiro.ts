// R3 (09-CLAUDE.md): aritmetica de dinheiro no frontend ocorre em centavos
// inteiros. `paraCentavos(a) + paraCentavos(b)` e exato; `Number(a) + Number(b)`
// sobre a string decimal nao e — por isso nenhum outro modulo deve somar/
// subtrair valores da API diretamente.

const CASAS_DECIMAIS = 2;

/** Converte a string decimal da API ("1234.56", "-50.00") em centavos
 * inteiros. So chama `Number()` sobre substrings garantidamente inteiras
 * (parte inteira e parte decimal em separado), nunca sobre o decimal
 * completo. */
export function paraCentavos(valorApi: string): number {
  const negativo = valorApi.trim().startsWith('-');
  const semSinal = valorApi.trim().replace(/^-/, '');
  const [parteInteira = '0', parteDecimal = ''] = semSinal.split('.');

  const decimalCompletado = parteDecimal.padEnd(CASAS_DECIMAIS, '0').slice(0, CASAS_DECIMAIS);
  const centavos = Number(parteInteira) * 100 + Number(decimalCompletado);

  return negativo ? -centavos : centavos;
}

/** Converte centavos inteiros de volta para a string decimal da API. */
export function deCentavos(centavos: number): string {
  const negativo = centavos < 0;
  const absolutos = Math.abs(Math.trunc(centavos));
  const inteiro = Math.floor(absolutos / 100);
  const decimal = String(absolutos % 100).padStart(CASAS_DECIMAIS, '0');

  return `${negativo ? '-' : ''}${inteiro}.${decimal}`;
}

/** Soma segura de valores da API — nunca `Number(a) + Number(b)`. */
export function somarValoresApi(...valoresApi: string[]): string {
  const totalCentavos = valoresApi.reduce((acumulado, valor) => acumulado + paraCentavos(valor), 0);
  return deCentavos(totalCentavos);
}

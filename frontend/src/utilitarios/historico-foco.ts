const MAXIMO_LEMBRADO = 5;

let historico: HTMLElement[] = [];

function registrar(evento: FocusEvent): void {
  const alvo = evento.target;
  // O `body` nao e' um destino util: e' onde o foco cai quando se perde.
  if (!(alvo instanceof HTMLElement) || alvo === document.body) return;
  historico = [alvo, ...historico.filter((item) => item !== alvo)].slice(0, MAXIMO_LEMBRADO);
}

// Instalado no import, e nao em algum `useEffect`: um dialogo montado sob
// condicao (`{aberto ? <Dialogo/> : null}`) so existe depois de o foco ja ter
// saido da origem, entao um ouvinte por instancia perderia justamente o
// evento que importa. Um unico ouvinte passivo, vivo desde o carregamento,
// enxerga toda a historia.
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', registrar);
}

/** Elemento focado mais recentemente que ainda esta no documento e esta fora
 * de `container` — o lugar de onde uma sobreposicao (dialogo) foi aberta.
 *
 * Guarda um historico, e nao apenas o ultimo, porque a cadeia de foco no
 * caminho "menu de acoes -> dialogo" passa por elementos que desaparecem com
 * o menu; o primeiro ainda conectado e' o candidato honesto. */
export function ultimoFocoFora(container: Element | null): HTMLElement | null {
  return (
    historico.find((item) => item.isConnected && !(container?.contains(item) ?? false)) ?? null
  );
}

/** Apenas para testes: zera o historico entre casos. */
export function limparHistoricoDeFoco(): void {
  historico = [];
}

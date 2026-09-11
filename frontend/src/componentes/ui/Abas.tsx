import type { KeyboardEvent, ReactElement, ReactNode } from 'react';

export interface DefinicaoAba {
  id: string;
  rotulo: string;
}

interface AbasProps {
  abas: readonly DefinicaoAba[];
  abaAtiva: string;
  aoAlterar: (id: string) => void;
  /** Nomeia o conjunto para leitores de tela ("Abas do grupo"). */
  rotuloLista: string;
  /** Prefixa os `id` gerados, para dois conjuntos de abas na mesma
   * pagina nao colidirem em `aria-controls`/`aria-labelledby`. */
  prefixo?: string;
}

/** Lista de abas navegavel por teclado (setas, Home, End), seguindo o
 * padrao ARIA de `tablist`: so a aba ativa fica na ordem de tabulacao, e
 * as setas movem entre elas. Os paineis ficam com quem chama — use
 * `PainelAba` com o mesmo `prefixo`. */
export function Abas({
  abas,
  abaAtiva,
  aoAlterar,
  rotuloLista,
  prefixo = 'aba',
}: AbasProps): ReactElement {
  function aoNavegarComTeclado(evento: KeyboardEvent<HTMLDivElement>): void {
    const indiceAtual = abas.findIndex((aba) => aba.id === abaAtiva);
    if (indiceAtual < 0) return;

    let proximoIndice: number | null = null;
    if (evento.key === 'ArrowRight') proximoIndice = (indiceAtual + 1) % abas.length;
    else if (evento.key === 'ArrowLeft')
      proximoIndice = (indiceAtual - 1 + abas.length) % abas.length;
    else if (evento.key === 'Home') proximoIndice = 0;
    else if (evento.key === 'End') proximoIndice = abas.length - 1;

    if (proximoIndice === null) return;
    evento.preventDefault();
    const proxima = abas[proximoIndice];
    if (!proxima) return;
    aoAlterar(proxima.id);
    document.getElementById(`${prefixo}-${proxima.id}`)?.focus();
  }

  return (
    // overflow-x-auto: com muitas abas em telas estreitas a lista rola
    // dentro de si mesma, em vez de empurrar a pagina (§8.4: nada de
    // scroll horizontal na pagina).
    <div
      role="tablist"
      aria-label={rotuloLista}
      onKeyDown={aoNavegarComTeclado}
      tabIndex={-1}
      className="flex gap-1 overflow-x-auto border-b border-borda print:hidden"
    >
      {abas.map((aba) => (
        <button
          key={aba.id}
          id={`${prefixo}-${aba.id}`}
          type="button"
          role="tab"
          aria-selected={aba.id === abaAtiva}
          aria-controls={`${prefixo}-painel-${aba.id}`}
          tabIndex={aba.id === abaAtiva ? 0 : -1}
          onClick={() => {
            aoAlterar(aba.id);
          }}
          className={
            aba.id === abaAtiva
              ? 'shrink-0 whitespace-nowrap border-b-2 border-primaria px-4 py-2 text-sm font-semibold text-primaria'
              : 'shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-textoSuave hover:text-texto'
          }
        >
          {aba.rotulo}
        </button>
      ))}
    </div>
  );
}

interface PainelAbaProps {
  id: string;
  abaAtiva: string;
  prefixo?: string;
  children: ReactNode;
}

/** Só monta o conteudo da aba ativa: cada painel dispara suas proprias
 * consultas, e montar todos de uma vez faria requisicoes que o usuario
 * nunca pediu. */
export function PainelAba({
  id,
  abaAtiva,
  prefixo = 'aba',
  children,
}: PainelAbaProps): ReactElement {
  const ativa = id === abaAtiva;
  return (
    <div
      id={`${prefixo}-painel-${id}`}
      role="tabpanel"
      aria-labelledby={`${prefixo}-${id}`}
      hidden={!ativa}
      className="pt-4"
    >
      {ativa ? children : null}
    </div>
  );
}

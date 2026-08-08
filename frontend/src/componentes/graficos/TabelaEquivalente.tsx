import type { ReactElement } from 'react';

export interface ColunaTabelaEquivalente<T> {
  chave: string;
  rotulo: string;
  renderizar: (linha: T) => string;
}

interface TabelaEquivalenteProps<T> {
  titulo: string;
  colunas: ColunaTabelaEquivalente<T>[];
  linhas: T[];
  obterChaveLinha: (linha: T) => string;
}

/** A11Y-04: alternativa textual de todo gráfico — `<details>` nativo
 * cobre "recolhível" sem JavaScript nenhum (foco, teclado e leitor de
 * tela já funcionam de fábrica). Contém TODOS os pontos da série, nunca
 * uma amostra. */
export function TabelaEquivalente<T>({
  titulo,
  colunas,
  linhas,
  obterChaveLinha,
}: TabelaEquivalenteProps<T>): ReactElement {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer select-none font-medium text-textoSuave hover:text-texto">
        Ver dados em tabela
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr className="border-b border-borda text-left text-xs text-textoSuave">
              {colunas.map((coluna) => (
                <th key={coluna.chave} scope="col" className="py-1.5 pr-3 font-medium">
                  {coluna.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={obterChaveLinha(linha)} className="border-b border-borda">
                {colunas.map((coluna) => (
                  <td key={coluna.chave} className="py-1.5 pr-3 text-texto">
                    {coluna.renderizar(linha)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

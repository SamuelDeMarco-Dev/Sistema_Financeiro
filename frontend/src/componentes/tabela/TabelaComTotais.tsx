import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utilitarios/cn';
import type { ReactElement, ReactNode } from 'react';

export interface ColunaTabelaComTotais<T> {
  chave: string;
  rotulo: string;
  renderizar: (linha: T) => ReactNode;
  /** Presente = coluna ordenável; ausente = cabeçalho não clicável. */
  valorOrdenacao?: (linha: T) => string | number;
  /** Presente = célula de totais no rodapé; ausente = célula vazia. */
  totalizar?: (linhas: T[]) => ReactNode;
  alinharDireita?: boolean;
}

interface TabelaComTotaisProps<T> {
  legenda: string;
  colunas: ColunaTabelaComTotais<T>[];
  linhas: T[];
  obterChave: (linha: T) => string;
  mostrarRodape?: boolean;
}

type Direcao = 'asc' | 'desc';

/** RF-72 a RF-74 (issue #55): toda tabela de relatório tem totais no
 * rodapé e ordenação por coluna clicável — `overflow-x-auto` PRÓPRIO
 * (não da página) garante que a página nunca rola na horizontal em
 * mobile, só a tabela. */
export function TabelaComTotais<T>({
  legenda,
  colunas,
  linhas,
  obterChave,
  mostrarRodape = true,
}: TabelaComTotaisProps<T>): ReactElement {
  const [ordenacao, setOrdenacao] = useState<{ chave: string; direcao: Direcao } | null>(null);

  const colunaOrdenacao = colunas.find((coluna) => coluna.chave === ordenacao?.chave);
  const linhasOrdenadas =
    ordenacao && colunaOrdenacao?.valorOrdenacao
      ? [...linhas].sort((a, b) => {
          const valorA = colunaOrdenacao.valorOrdenacao?.(a) ?? '';
          const valorB = colunaOrdenacao.valorOrdenacao?.(b) ?? '';
          const comparacao = valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
          return ordenacao.direcao === 'asc' ? comparacao : -comparacao;
        })
      : linhas;

  function alternarOrdenacao(chave: string): void {
    setOrdenacao((atual) => {
      if (atual?.chave !== chave) return { chave, direcao: 'asc' };
      if (atual.direcao === 'asc') return { chave, direcao: 'desc' };
      return null;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr className="border-b border-borda text-left text-xs text-textoSuave">
            {colunas.map((coluna) => (
              <th
                key={coluna.chave}
                scope="col"
                className={cn('py-2 pr-3 font-medium', coluna.alinharDireita && 'text-right')}
              >
                {coluna.valorOrdenacao ? (
                  <button
                    type="button"
                    onClick={() => {
                      alternarOrdenacao(coluna.chave);
                    }}
                    className="inline-flex items-center gap-1 hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
                  >
                    {coluna.rotulo}
                    {ordenacao?.chave === coluna.chave ? (
                      ordenacao.direcao === 'asc' ? (
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  coluna.rotulo
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhasOrdenadas.map((linha) => (
            <tr key={obterChave(linha)} className="border-b border-borda">
              {colunas.map((coluna) => (
                <td
                  key={coluna.chave}
                  className={cn('py-2 pr-3 text-texto', coluna.alinharDireita && 'text-right')}
                >
                  {coluna.renderizar(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {mostrarRodape ? (
          <tfoot>
            <tr className="border-t-2 border-borda font-semibold">
              {colunas.map((coluna) => (
                <td
                  key={coluna.chave}
                  className={cn('py-2 pr-3 text-texto', coluna.alinharDireita && 'text-right')}
                >
                  {coluna.totalizar ? coluna.totalizar(linhas) : null}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

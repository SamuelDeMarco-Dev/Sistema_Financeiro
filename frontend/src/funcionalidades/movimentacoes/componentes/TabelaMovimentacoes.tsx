import { formatarDataBr } from '@/utilitarios/data';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { AcoesMovimentacao } from './AcoesMovimentacao';
import { AutorMovimentacao } from './AutorMovimentacao';
import { IndicadoresMovimentacao } from './IndicadoresMovimentacao';
import { SeloSituacao } from './SeloSituacao';
import type { AcoesPermitidas } from './AcoesMovimentacao';
import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface TabelaMovimentacoesProps {
  movimentacoes: Movimentacao[];
  onEditar: (movimentacao: Movimentacao) => void;
  onExcluir: (movimentacao: Movimentacao) => void;
  /** Coluna de autor — só faz sentido no escopo de grupo (RF-59); no
   * escopo pessoal o autor é sempre o próprio usuário. */
  mostrarAutor?: boolean;
  /** Ações permitidas por linha. Ausente ⇒ todas (escopo pessoal). */
  permitidasPorLinha?: (movimentacao: Movimentacao) => AcoesPermitidas;
}

/** Visível a partir de `md` (768px) — abaixo disso, `ListaCartoesMovimentacoes`
 * assume, sem scroll horizontal (RF-34). */
export function TabelaMovimentacoes({
  movimentacoes,
  onEditar,
  onExcluir,
  mostrarAutor = false,
  permitidasPorLinha,
}: TabelaMovimentacoesProps): ReactElement {
  return (
    <table className="hidden w-full border-collapse text-sm md:table">
      <thead>
        <tr className="border-b border-borda text-left text-xs text-textoSuave">
          <th scope="col" className="py-2 pr-3 font-medium">
            Data
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Descrição
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Conta
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Categoria
          </th>
          {mostrarAutor ? (
            <th scope="col" className="py-2 pr-3 font-medium">
              Autor
            </th>
          ) : null}
          <th scope="col" className="py-2 pr-3 text-right font-medium">
            Valor
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Situação
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {movimentacoes.map((movimentacao) => {
          const ehReceita = movimentacao.tipo === 'RECEITA';
          const ehDespesa = movimentacao.tipo === 'DESPESA';
          const corValor = ehReceita ? 'text-sucesso' : ehDespesa ? 'text-perigo' : 'text-texto';
          const sinal = ehReceita ? '+ ' : ehDespesa ? '− ' : '';

          return (
            <tr key={movimentacao.id} className="border-b border-borda">
              <td className="whitespace-nowrap py-3 pr-3 text-texto">
                {formatarDataBr(movimentacao.dataCompetencia)}
              </td>
              <td className="min-w-0 py-3 pr-3">
                <p className="truncate font-medium text-texto">{movimentacao.descricao}</p>
                <IndicadoresMovimentacao movimentacao={movimentacao} />
              </td>
              <td className="py-3 pr-3 text-textoSuave">{movimentacao.conta?.nome ?? '—'}</td>
              <td className="py-3 pr-3 text-textoSuave">{movimentacao.categoria?.nome ?? '—'}</td>
              {mostrarAutor ? (
                <td className="min-w-0 py-3 pr-3">
                  <AutorMovimentacao autor={movimentacao.autor} />
                </td>
              ) : null}
              <td
                className={`whitespace-nowrap py-3 pr-3 text-right font-mono tabular-nums ${corValor}`}
              >
                {sinal}
                {formatarMoeda(movimentacao.valor)}
              </td>
              <td className="py-3 pr-3">
                <SeloSituacao situacao={movimentacao.situacao} />
              </td>
              <td className="py-3 pr-3 text-right">
                <AcoesMovimentacao
                  movimentacao={movimentacao}
                  onEditar={onEditar}
                  onExcluir={onExcluir}
                  {...(permitidasPorLinha && { permitidas: permitidasPorLinha(movimentacao) })}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

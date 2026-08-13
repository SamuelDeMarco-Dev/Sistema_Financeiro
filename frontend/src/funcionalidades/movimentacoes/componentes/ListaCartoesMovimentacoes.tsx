import { formatarDataBr } from '@/utilitarios/data';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { AcoesMovimentacao } from './AcoesMovimentacao';
import { AutorMovimentacao } from './AutorMovimentacao';
import { IndicadoresMovimentacao } from './IndicadoresMovimentacao';
import { SeloSituacao } from './SeloSituacao';
import type { AcoesPermitidas } from './AcoesMovimentacao';
import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface ListaCartoesMovimentacoesProps {
  movimentacoes: Movimentacao[];
  onEditar: (movimentacao: Movimentacao) => void;
  onExcluir: (movimentacao: Movimentacao) => void;
  /** Autor do lançamento — só no escopo de grupo (RF-59). */
  mostrarAutor?: boolean;
  /** Ações permitidas por linha. Ausente ⇒ todas (escopo pessoal). */
  permitidasPorLinha?: (movimentacao: Movimentacao) => AcoesPermitidas;
}

/** Visível abaixo de `md` (768px) — a partir daí, `TabelaMovimentacoes`
 * assume. Mesmos dados da tabela, num cartão por movimentação em vez de
 * linhas, para não precisar de scroll horizontal em telas estreitas. */
export function ListaCartoesMovimentacoes({
  movimentacoes,
  onEditar,
  onExcluir,
  mostrarAutor = false,
  permitidasPorLinha,
}: ListaCartoesMovimentacoesProps): ReactElement {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {movimentacoes.map((movimentacao) => {
        const ehReceita = movimentacao.tipo === 'RECEITA';
        const ehDespesa = movimentacao.tipo === 'DESPESA';
        const corValor = ehReceita ? 'text-sucesso' : ehDespesa ? 'text-perigo' : 'text-texto';
        const sinal = ehReceita ? '+ ' : ehDespesa ? '− ' : '';

        return (
          <li
            key={movimentacao.id}
            className="flex flex-col gap-2 rounded-md border border-borda bg-superficie p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-texto">{movimentacao.descricao}</p>
                <p className="text-sm text-textoSuave">
                  {formatarDataBr(movimentacao.dataCompetencia)} ·{' '}
                  {movimentacao.categoria?.nome ?? 'Sem categoria'}
                </p>
              </div>
              <AcoesMovimentacao
                movimentacao={movimentacao}
                onEditar={onEditar}
                onExcluir={onExcluir}
                {...(permitidasPorLinha && { permitidas: permitidasPorLinha(movimentacao) })}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className={`font-mono tabular-nums ${corValor}`}>
                {sinal}
                {formatarMoeda(movimentacao.valor)}
              </span>
              <SeloSituacao situacao={movimentacao.situacao} />
            </div>

            <p className="text-xs text-textoSuave">{movimentacao.conta?.nome ?? 'Sem conta'}</p>
            {mostrarAutor ? (
              <div className="text-xs">
                <AutorMovimentacao autor={movimentacao.autor} />
              </div>
            ) : null}
            <IndicadoresMovimentacao movimentacao={movimentacao} />
          </li>
        );
      })}
    </ul>
  );
}

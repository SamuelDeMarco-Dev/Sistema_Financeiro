import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { ImagemGrupo } from './ImagemGrupo';
import { SeloPapel } from './SeloPapel';
import type { ContaCompartilhadaListaItem } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface CartaoGrupoProps {
  grupo: ContaCompartilhadaListaItem;
}

export function CartaoGrupo({ grupo }: CartaoGrupoProps): ReactElement {
  const saldoNegativo = paraCentavos(grupo.saldoTotal) < 0;
  const rotuloContas =
    grupo.quantidadeContas === 1 ? '1 conta' : `${grupo.quantidadeContas} contas`;

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-borda bg-superficie p-4">
      <div className="flex min-w-0 items-center gap-3">
        <ImagemGrupo
          nome={grupo.nome}
          imagemUrl={grupo.imagemUrl}
          cor={grupo.cor}
          className="h-11 w-11 text-lg"
        />
        <div className="min-w-0 flex-1">
          {/* O cartao inteiro poderia ser clicavel, mas um link no titulo
              mantem um unico alvo de foco por cartao na navegacao por
              teclado (A11Y-04). */}
          <Link
            to={`/compartilhadas/${grupo.id}`}
            className="block truncate font-medium text-texto hover:text-primaria focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
          >
            {grupo.nome}
          </Link>
          <p className="flex items-center gap-1 text-sm text-textoSuave">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {grupo.quantidadeMembros} {grupo.quantidadeMembros === 1 ? 'membro' : 'membros'} ·{' '}
            {rotuloContas}
          </p>
        </div>
        <SeloPapel papel={grupo.meuPapel} />
      </div>

      <p
        className={
          saldoNegativo
            ? 'font-mono text-xl font-semibold tabular-nums text-perigo'
            : 'font-mono text-xl font-semibold tabular-nums text-texto'
        }
      >
        {formatarMoeda(grupo.saldoTotal, grupo.moeda)}
      </p>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-textoSuave">
        <div className="flex gap-1">
          <dt>Receitas do mês:</dt>
          <dd className="font-mono tabular-nums text-sucesso">
            {formatarMoeda(grupo.resumoMesAtual.receitas, grupo.moeda)}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Despesas do mês:</dt>
          <dd className="font-mono tabular-nums text-perigo">
            {formatarMoeda(grupo.resumoMesAtual.despesas, grupo.moeda)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

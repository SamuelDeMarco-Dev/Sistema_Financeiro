import { ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { ImagemGrupo } from './ImagemGrupo';
import { SeloPapel } from './SeloPapel';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface CabecalhoGrupoProps {
  grupo: ContaCompartilhadaDetalhe;
}

export function CabecalhoGrupo({ grupo }: CabecalhoGrupoProps): ReactElement {
  const saldoNegativo = paraCentavos(grupo.saldoTotal) < 0;
  const membrosAtivos = grupo.membros.filter((membro) => membro.situacao === 'ATIVO').length;

  return (
    <header className="flex flex-col gap-4">
      <Link
        to="/compartilhadas"
        className="flex w-fit items-center gap-1 text-sm font-medium text-textoSuave hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Compartilhadas
      </Link>

      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ImagemGrupo
            nome={grupo.nome}
            imagemUrl={grupo.imagemUrl}
            cor={grupo.cor}
            className="h-14 w-14 text-2xl"
          />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-texto">{grupo.nome}</h1>
              <SeloPapel papel={grupo.meuPapel} />
            </div>
            {grupo.descricao ? (
              <p className="truncate text-sm text-textoSuave">{grupo.descricao}</p>
            ) : null}
            <p className="flex items-center gap-1 text-sm text-textoSuave">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {membrosAtivos} {membrosAtivos === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>

        <div className="shrink-0 md:text-right">
          <p className="text-xs text-textoSuave">Saldo do grupo</p>
          <p
            className={
              saldoNegativo
                ? 'font-mono text-2xl font-semibold tabular-nums text-perigo'
                : 'font-mono text-2xl font-semibold tabular-nums text-texto'
            }
          >
            {formatarMoeda(grupo.saldoTotal, grupo.moeda)}
          </p>
        </div>
      </div>
    </header>
  );
}

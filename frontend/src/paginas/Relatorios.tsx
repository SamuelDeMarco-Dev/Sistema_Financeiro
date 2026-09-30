import { Download } from 'lucide-react';
import { usePerfil } from '@/funcionalidades/perfil/hooks/usePerfil';
import { AbaAnual } from '@/funcionalidades/relatorios/componentes/AbaAnual';
import { AbaFluxoCaixa } from '@/funcionalidades/relatorios/componentes/AbaFluxoCaixa';
import { AbaMensal } from '@/funcionalidades/relatorios/componentes/AbaMensal';
import { AbaPorCategoria } from '@/funcionalidades/relatorios/componentes/AbaPorCategoria';
import { AbaPorConta } from '@/funcionalidades/relatorios/componentes/AbaPorConta';
import { NavegacaoPeriodo } from '@/funcionalidades/relatorios/componentes/NavegacaoPeriodo';
import {
  ABAS_RELATORIO,
  ROTULO_ABA_RELATORIO,
  useRelatoriosUrl,
} from '@/funcionalidades/relatorios/hooks/useRelatoriosUrl';
import type { AbaRelatorio } from '@/funcionalidades/relatorios/hooks/useRelatoriosUrl';
import { rotuloMesCompleto } from '@/funcionalidades/relatorios/utilitarios/periodo';
import { hojeNoTimezone } from '@/utilitarios/data';
import type { KeyboardEvent, ReactElement } from 'react';

const USA_NAVEGACAO_ANUAL: readonly AbaRelatorio[] = ['ANUAL'];

export function Relatorios(): ReactElement {
  const { data: perfil } = usePerfil();
  const timezone = perfil?.timezone ?? 'America/Sao_Paulo';
  const [anoHoje, mesHoje] = hojeNoTimezone(timezone).split('-').map(Number) as [number, number];

  const { aba, ano, mes, definirAba, definirAno, definirMes } = useRelatoriosUrl({
    ano: anoHoje,
    mes: mesHoje,
  });

  const navegacaoAnual = USA_NAVEGACAO_ANUAL.includes(aba);

  function aoNavegarComTeclado(evento: KeyboardEvent<HTMLDivElement>): void {
    const indiceAtual = ABAS_RELATORIO.indexOf(aba);
    let proximoIndice: number | null = null;

    if (evento.key === 'ArrowRight') proximoIndice = (indiceAtual + 1) % ABAS_RELATORIO.length;
    else if (evento.key === 'ArrowLeft')
      proximoIndice = (indiceAtual - 1 + ABAS_RELATORIO.length) % ABAS_RELATORIO.length;
    else if (evento.key === 'Home') proximoIndice = 0;
    else if (evento.key === 'End') proximoIndice = ABAS_RELATORIO.length - 1;

    if (proximoIndice === null) return;
    evento.preventDefault();
    const proximaAba = ABAS_RELATORIO[proximoIndice];
    if (!proximaAba) return;
    definirAba(proximaAba);
    document.getElementById(`aba-${proximaAba}`)?.focus();
  }

  return (
    <div className="mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold text-texto">Relatórios</h1>
        <div className="flex flex-wrap items-center gap-3">
          {navegacaoAnual ? (
            <NavegacaoPeriodo
              rotulo={String(ano)}
              rotuloAnterior="Ano anterior"
              rotuloProximo="Próximo ano"
              onAnterior={() => {
                definirAno(ano - 1);
              }}
              onProximo={() => {
                definirAno(ano + 1);
              }}
            />
          ) : (
            <NavegacaoPeriodo
              rotulo={rotuloMesCompleto(ano, mes)}
              rotuloAnterior="Mês anterior"
              rotuloProximo="Próximo mês"
              onAnterior={() => {
                definirMes(mes - 1);
              }}
              onProximo={() => {
                definirMes(mes + 1);
              }}
            />
          )}
          <button
            type="button"
            disabled
            title="Disponível na v2.0"
            className="flex items-center gap-2 rounded-md border border-borda px-3 py-2 text-sm font-medium text-textoSuave opacity-60 print:hidden"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Exportar
          </button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Relatórios"
        onKeyDown={aoNavegarComTeclado}
        tabIndex={-1}
        className="flex flex-wrap gap-1 border-b border-borda print:hidden"
      >
        {ABAS_RELATORIO.map((idAba) => (
          <button
            key={idAba}
            id={`aba-${idAba}`}
            type="button"
            role="tab"
            aria-selected={aba === idAba}
            aria-controls={`painel-${idAba}`}
            tabIndex={aba === idAba ? 0 : -1}
            onClick={() => {
              definirAba(idAba);
            }}
            className={
              aba === idAba
                ? 'border-b-2 border-primaria px-4 py-2 text-sm font-semibold text-primaria'
                : 'border-b-2 border-transparent px-4 py-2 text-sm font-medium text-textoSuave hover:text-texto'
            }
          >
            {ROTULO_ABA_RELATORIO[idAba]}
          </button>
        ))}
      </div>

      <div
        id="painel-MENSAL"
        role="tabpanel"
        aria-labelledby="aba-MENSAL"
        hidden={aba !== 'MENSAL'}
      >
        {aba === 'MENSAL' ? <AbaMensal ano={ano} mes={mes} /> : null}
      </div>
      <div id="painel-ANUAL" role="tabpanel" aria-labelledby="aba-ANUAL" hidden={aba !== 'ANUAL'}>
        {aba === 'ANUAL' ? <AbaAnual ano={ano} /> : null}
      </div>
      <div
        id="painel-POR_CATEGORIA"
        role="tabpanel"
        aria-labelledby="aba-POR_CATEGORIA"
        hidden={aba !== 'POR_CATEGORIA'}
      >
        {aba === 'POR_CATEGORIA' ? <AbaPorCategoria ano={ano} mes={mes} /> : null}
      </div>
      <div
        id="painel-POR_CONTA"
        role="tabpanel"
        aria-labelledby="aba-POR_CONTA"
        hidden={aba !== 'POR_CONTA'}
      >
        {aba === 'POR_CONTA' ? <AbaPorConta ano={ano} mes={mes} /> : null}
      </div>
      <div
        id="painel-FLUXO_CAIXA"
        role="tabpanel"
        aria-labelledby="aba-FLUXO_CAIXA"
        hidden={aba !== 'FLUXO_CAIXA'}
      >
        {aba === 'FLUXO_CAIXA' ? <AbaFluxoCaixa ano={ano} mes={mes} /> : null}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CampoData } from '@/componentes/formulario/CampoData';
import { SeletorMultiplo } from '@/componentes/formulario/SeletorMultiplo';
import { Botao } from '@/componentes/ui/Botao';
import { useCategorias } from '@/funcionalidades/categorias/hooks/useCategorias';
import { useContas } from '@/funcionalidades/contas/hooks/useContas';
import { useEtiquetas } from '@/funcionalidades/etiquetas/hooks/useEtiquetas';
import { useDebounce } from '@/hooks/useDebounce';
import {
  ROTULO_SITUACAO_MOVIMENTACAO,
  ROTULO_TIPO_MOVIMENTACAO,
  SITUACOES_MOVIMENTACAO,
  TIPOS_MOVIMENTACAO,
} from '../tipos/movimentacao';
import { ATALHOS_PERIODO, periodoDoAtalho, ROTULO_ATALHO_PERIODO } from '../utilitarios/periodo';
import type { FiltrosMovimentacoesUrl } from '../hooks/useFiltrosUrl';
import type { AtalhoPeriodo } from '../utilitarios/periodo';
import type { ChangeEvent, ReactElement } from 'react';

interface BarraFiltrosProps {
  filtros: FiltrosMovimentacoesUrl;
  aoAlterar: (parciais: Partial<FiltrosMovimentacoesUrl>) => void;
  timezone: string;
}

const OPCOES_TIPO = TIPOS_MOVIMENTACAO.map((tipo) => ({
  valor: tipo,
  rotulo: ROTULO_TIPO_MOVIMENTACAO[tipo],
}));
const OPCOES_SITUACAO = SITUACOES_MOVIMENTACAO.map((situacao) => ({
  valor: situacao,
  rotulo: ROTULO_SITUACAO_MOVIMENTACAO[situacao],
}));

function atalhoAtivo(
  filtros: FiltrosMovimentacoesUrl,
  timezone: string,
): AtalhoPeriodo | 'PERSONALIZADO' | null {
  if (!filtros.dataInicio && !filtros.dataFim) return null;
  for (const atalho of ATALHOS_PERIODO) {
    const periodo = periodoDoAtalho(atalho, timezone);
    if (periodo.dataInicio === filtros.dataInicio && periodo.dataFim === filtros.dataFim) {
      return atalho;
    }
  }
  return 'PERSONALIZADO';
}

/** RF-34: filtros de período, tipo, situação, conta, categoria, etiqueta
 * e busca — todos propagados via `aoAlterar` para o estado sincronizado
 * com a URL (`useFiltrosUrl`). A busca tem debounce de 400ms: o texto
 * digitado é local, só disparando `aoAlterar` (e portanto uma nova
 * requisição) numa pausa de digitação. */
export function BarraFiltros({ filtros, aoAlterar, timezone }: BarraFiltrosProps): ReactElement {
  const [textoBusca, setTextoBusca] = useState(filtros.busca);
  const [buscaSincronizada, setBuscaSincronizada] = useState(filtros.busca);
  const [personalizadoAberto, setPersonalizadoAberto] = useState(false);
  const buscaDebounced = useDebounce(textoBusca, 400);

  const { data: dadosContas } = useContas();
  const { data: categorias } = useCategorias();
  const { data: etiquetas } = useEtiquetas();

  // Ajuste de estado durante a renderizacao (nao num efeito, mesmo padrao
  // de CampoData): quando `filtros.busca` muda por uma via externa (ex.:
  // "limpar todos"), o texto exibido precisa acompanhar.
  if (filtros.busca !== buscaSincronizada) {
    setBuscaSincronizada(filtros.busca);
    setTextoBusca(filtros.busca);
  }

  useEffect(() => {
    if (buscaDebounced !== filtros.busca) {
      aoAlterar({ busca: buscaDebounced });
    }
  }, [buscaDebounced, filtros.busca, aoAlterar]);

  const opcoesConta = (dadosContas?.contas ?? []).map((conta) => ({
    valor: conta.id,
    rotulo: conta.nome,
  }));
  const opcoesCategoria = (categorias ?? []).flatMap((raiz) => [
    { valor: raiz.id, rotulo: raiz.nome },
    ...raiz.subcategorias.map((sub) => ({ valor: sub.id, rotulo: `${raiz.nome} · ${sub.nome}` })),
  ]);
  const opcoesEtiqueta = (etiquetas ?? []).map((etiqueta) => ({
    valor: etiqueta.id,
    rotulo: etiqueta.nome,
  }));

  const atalho = atalhoAtivo(filtros, timezone);

  function selecionarAtalho(novoAtalho: AtalhoPeriodo): void {
    setPersonalizadoAberto(false);
    aoAlterar(periodoDoAtalho(novoAtalho, timezone));
  }

  function aoBuscar(evento: ChangeEvent<HTMLInputElement>): void {
    setTextoBusca(evento.target.value);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {ATALHOS_PERIODO.map((opcao) => (
          <Botao
            key={opcao}
            type="button"
            variante={atalho === opcao ? 'primaria' : 'secundaria'}
            className="min-h-[40px] px-3 py-1.5 text-sm"
            onClick={() => {
              selecionarAtalho(opcao);
            }}
          >
            {ROTULO_ATALHO_PERIODO[opcao]}
          </Botao>
        ))}
        <Botao
          type="button"
          variante={atalho === 'PERSONALIZADO' || personalizadoAberto ? 'primaria' : 'secundaria'}
          className="min-h-[40px] px-3 py-1.5 text-sm"
          onClick={() => {
            setPersonalizadoAberto((valor) => !valor);
          }}
        >
          Personalizado
        </Botao>

        <SeletorMultiplo
          rotulo="Tipo"
          opcoes={OPCOES_TIPO}
          valor={filtros.tipo}
          aoAlterar={(tipo) => {
            aoAlterar({ tipo: tipo as FiltrosMovimentacoesUrl['tipo'] });
          }}
        />
        <SeletorMultiplo
          rotulo="Situação"
          opcoes={OPCOES_SITUACAO}
          valor={filtros.situacao}
          aoAlterar={(situacao) => {
            aoAlterar({ situacao: situacao as FiltrosMovimentacoesUrl['situacao'] });
          }}
        />
        <SeletorMultiplo
          rotulo="Conta"
          opcoes={opcoesConta}
          valor={filtros.contaId}
          aoAlterar={(contaId) => {
            aoAlterar({ contaId });
          }}
        />
        <SeletorMultiplo
          rotulo="Categoria"
          opcoes={opcoesCategoria}
          valor={filtros.categoriaId}
          aoAlterar={(categoriaId) => {
            aoAlterar({ categoriaId });
          }}
        />
        <SeletorMultiplo
          rotulo="Etiqueta"
          opcoes={opcoesEtiqueta}
          valor={filtros.etiquetaId}
          aoAlterar={(etiquetaId) => {
            aoAlterar({ etiquetaId });
          }}
        />

        <label className="sr-only" htmlFor="busca-movimentacoes">
          Buscar por descrição ou observação
        </label>
        <input
          id="busca-movimentacoes"
          type="search"
          value={textoBusca}
          placeholder="Buscar..."
          onChange={aoBuscar}
          className="min-h-[40px] flex-1 rounded-md border border-borda bg-superficie px-3 py-1.5 text-sm text-texto placeholder:text-textoSuave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
        />
      </div>

      {personalizadoAberto ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-borda bg-superficie p-3">
          <CampoData
            rotulo="De"
            valor={filtros.dataInicio}
            aoAlterar={(dataIso) => {
              aoAlterar({ dataInicio: dataIso });
            }}
            timezone={timezone}
          />
          <CampoData
            rotulo="Até"
            valor={filtros.dataFim}
            aoAlterar={(dataIso) => {
              aoAlterar({ dataFim: dataIso });
            }}
            timezone={timezone}
          />
        </div>
      ) : null}
    </div>
  );
}

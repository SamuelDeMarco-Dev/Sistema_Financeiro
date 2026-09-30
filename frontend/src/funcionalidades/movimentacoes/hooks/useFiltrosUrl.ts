import { useSearchParams } from 'react-router-dom';
import { SITUACOES_MOVIMENTACAO, TIPOS_MOVIMENTACAO } from '../tipos/movimentacao';
import type { SituacaoMovimentacao, TipoMovimentacao } from '../tipos/movimentacao';

export interface FiltrosMovimentacoesUrl {
  dataInicio: string | null;
  dataFim: string | null;
  tipo: TipoMovimentacao[];
  situacao: SituacaoMovimentacao[];
  contaId: string[];
  categoriaId: string[];
  etiquetaId: string[];
  busca: string;
  pagina: number;
}

export const FILTROS_URL_PADRAO: FiltrosMovimentacoesUrl = {
  dataInicio: null,
  dataFim: null,
  tipo: [],
  situacao: [],
  contaId: [],
  categoriaId: [],
  etiquetaId: [],
  busca: '',
  pagina: 1,
};

interface ResultadoFiltrosUrl {
  filtros: FiltrosMovimentacoesUrl;
  definirFiltros: (parciais: Partial<FiltrosMovimentacoesUrl>) => void;
  limparTodos: () => void;
}

function paraListaEnum<T extends string>(valor: string | null, valoresValidos: readonly T[]): T[] {
  if (!valor) return [];
  const validos: readonly string[] = valoresValidos;
  return valor.split(',').filter((item): item is T => validos.includes(item));
}

function paraListaLivre(valor: string | null): string[] {
  if (!valor) return [];
  return valor.split(',').filter((item) => item !== '');
}

function deParams(params: URLSearchParams): FiltrosMovimentacoesUrl {
  const pagina = Number(params.get('pagina'));
  return {
    dataInicio: params.get('dataInicio'),
    dataFim: params.get('dataFim'),
    tipo: paraListaEnum(params.get('tipo'), TIPOS_MOVIMENTACAO),
    situacao: paraListaEnum(params.get('situacao'), SITUACOES_MOVIMENTACAO),
    contaId: paraListaLivre(params.get('contaId')),
    categoriaId: paraListaLivre(params.get('categoriaId')),
    etiquetaId: paraListaLivre(params.get('etiquetaId')),
    busca: params.get('busca') ?? '',
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}

function paraParams(filtros: FiltrosMovimentacoesUrl): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
  if (filtros.tipo.length > 0) params.set('tipo', filtros.tipo.join(','));
  if (filtros.situacao.length > 0) params.set('situacao', filtros.situacao.join(','));
  if (filtros.contaId.length > 0) params.set('contaId', filtros.contaId.join(','));
  if (filtros.categoriaId.length > 0) params.set('categoriaId', filtros.categoriaId.join(','));
  if (filtros.etiquetaId.length > 0) params.set('etiquetaId', filtros.etiquetaId.join(','));
  if (filtros.busca.trim() !== '') params.set('busca', filtros.busca);
  if (filtros.pagina > 1) params.set('pagina', String(filtros.pagina));
  return params;
}

/** RF-34/RF-35: os filtros vivem inteiramente na URL — recarregar a
 * pagina ou compartilhar o link reproduz a mesma visao. Alterar qualquer
 * filtro (exceto a propria pagina) volta para a pagina 1, mesmo padrao de
 * qualquer lista paginada. */
export function useFiltrosUrl(): ResultadoFiltrosUrl {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtros = deParams(searchParams);

  function definirFiltros(parciais: Partial<FiltrosMovimentacoesUrl>): void {
    const alterouPaginaExplicitamente = Object.keys(parciais).length === 1 && 'pagina' in parciais;
    setSearchParams(
      paraParams({
        ...filtros,
        ...parciais,
        pagina: alterouPaginaExplicitamente ? (parciais.pagina ?? 1) : 1,
      }),
    );
  }

  function limparTodos(): void {
    setSearchParams(paraParams(FILTROS_URL_PADRAO));
  }

  return { filtros, definirFiltros, limparTodos };
}

import { useSearchParams } from 'react-router-dom';

export interface FiltroPeriodoUrl {
  dataInicio: string | null;
  dataFim: string | null;
}

interface ResultadoFiltroPeriodoUrl {
  periodo: FiltroPeriodoUrl;
  definirPeriodo: (periodo: FiltroPeriodoUrl) => void;
}

/** RF-47: o periodo selecionado vive na URL — reabrir o link (ou dar F5)
 * reproduz a mesma visao. Ausencia dos dois parametros significa "use o
 * padrao do servidor" (mes corrente no timezone do perfil), por isso
 * `limpar` remove os parametros em vez de escrever um periodo calculado
 * aqui — o backend e a fonte da verdade sobre "mes corrente". */
export function useFiltroPeriodoUrl(): ResultadoFiltroPeriodoUrl {
  const [searchParams, setSearchParams] = useSearchParams();

  const periodo: FiltroPeriodoUrl = {
    dataInicio: searchParams.get('dataInicio'),
    dataFim: searchParams.get('dataFim'),
  };

  function definirPeriodo(novoPeriodo: FiltroPeriodoUrl): void {
    const params = new URLSearchParams();
    if (novoPeriodo.dataInicio) params.set('dataInicio', novoPeriodo.dataInicio);
    if (novoPeriodo.dataFim) params.set('dataFim', novoPeriodo.dataFim);
    setSearchParams(params);
  }

  return { periodo, definirPeriodo };
}

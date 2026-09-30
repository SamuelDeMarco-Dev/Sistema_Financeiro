import { useSearchParams } from 'react-router-dom';

export const ABAS_GRUPO = [
  'movimentacoes',
  'contas',
  'membros',
  'categorias',
  'auditoria',
  'configuracoes',
] as const;
export type AbaGrupo = (typeof ABAS_GRUPO)[number];

export const ROTULO_ABA_GRUPO: Record<AbaGrupo, string> = {
  movimentacoes: 'Movimentações',
  contas: 'Contas',
  membros: 'Membros',
  categorias: 'Categorias',
  auditoria: 'Auditoria',
  configuracoes: 'Configurações',
};

interface ResultadoAbaGrupoUrl {
  aba: AbaGrupo;
  definirAba: (aba: AbaGrupo) => void;
}

function ehAbaValida(valor: string | null): valor is AbaGrupo {
  return valor !== null && (ABAS_GRUPO as readonly string[]).includes(valor);
}

/** A aba vive na URL (criterio de aceite da issue #75): recarregar,
 * compartilhar o link ou voltar no historico cai na mesma aba. Valor
 * invalido ou ausente volta para Movimentacoes, a aba de trabalho. */
export function useAbaGrupoUrl(): ResultadoAbaGrupoUrl {
  const [searchParams, setSearchParams] = useSearchParams();
  const abaParam = searchParams.get('aba');
  const aba: AbaGrupo = ehAbaValida(abaParam) ? abaParam : 'movimentacoes';

  function definirAba(proxima: AbaGrupo): void {
    const proximos = new URLSearchParams(searchParams);
    proximos.set('aba', proxima);
    // replace: trocar de aba nao deve encher o historico de voltas.
    setSearchParams(proximos, { replace: true });
  }

  return { aba, definirAba };
}

import { useQuery } from '@tanstack/react-query';
import { CHAVES_CONSULTA } from '@/constantes/chaves-consulta';
import { listarSessoes } from '@/servicos/autenticacao.servico';
import type { SessaoAtiva } from '@/tipos/sessao';
import type { UseQueryResult } from '@tanstack/react-query';

export function useSessoesAtivas(): UseQueryResult<SessaoAtiva[]> {
  return useQuery({ queryKey: CHAVES_CONSULTA.sessoes, queryFn: listarSessoes });
}

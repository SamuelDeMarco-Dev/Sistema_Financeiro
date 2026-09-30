import { useQuery } from '@tanstack/react-query';
import { listarSessoes } from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import type { SessaoAtiva } from '@/funcionalidades/autenticacao/tipos/sessao';
import type { UseQueryResult } from '@tanstack/react-query';

// 02-ARCHITECTURE.md §6.3: chaves de query moram junto do hook que as
// declara, nao numa constante global.
export const chavesSessoes = { todas: ['autenticacao', 'sessoes'] as const };

export function useSessoesAtivas(): UseQueryResult<SessaoAtiva[]> {
  return useQuery({ queryKey: chavesSessoes.todas, queryFn: listarSessoes });
}

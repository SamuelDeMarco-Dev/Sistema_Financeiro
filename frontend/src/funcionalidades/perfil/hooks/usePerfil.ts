import { useQuery } from '@tanstack/react-query';
import { consultarPerfil } from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import type { UseQueryResult } from '@tanstack/react-query';

// 02-ARCHITECTURE.md §6.3: chaves de query moram junto do hook que as
// declara, nao numa constante global — evitam import cruzado entre
// funcionalidades so para compartilhar uma string.
export const chavesPerfil = { todas: ['perfil'] as const };

export function usePerfil(): UseQueryResult<PerfilCompleto> {
  return useQuery({ queryKey: chavesPerfil.todas, queryFn: consultarPerfil });
}

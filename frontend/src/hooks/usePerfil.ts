import { useQuery } from '@tanstack/react-query';
import { CHAVES_CONSULTA } from '@/constantes/chaves-consulta';
import { consultarPerfil } from '@/servicos/perfil.servico';
import type { PerfilCompleto } from '@/tipos/perfil';
import type { UseQueryResult } from '@tanstack/react-query';

export function usePerfil(): UseQueryResult<PerfilCompleto> {
  return useQuery({ queryKey: CHAVES_CONSULTA.perfil, queryFn: consultarPerfil });
}

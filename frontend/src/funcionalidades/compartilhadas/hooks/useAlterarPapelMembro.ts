import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { alterarPapelMembro } from '../servicos/conta-compartilhada.servico';
import { ROTULO_PAPEL } from '../tipos/conta-compartilhada';
import type { MembroDoGrupo, PapelConvidavel } from '../tipos/conta-compartilhada';
import type { UseMutationResult } from '@tanstack/react-query';

interface VariaveisAlterarPapel {
  membroId: string;
  papel: PapelConvidavel;
}

export function useAlterarPapelMembro(
  contaCompartilhadaId: string,
): UseMutationResult<MembroDoGrupo, ErroApi, VariaveisAlterarPapel> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ membroId, papel }: VariaveisAlterarPapel) =>
      alterarPapelMembro(contaCompartilhadaId, membroId, papel),
    onSuccess: (membro) => {
      // O papel de um membro muda o que ele pode fazer, e `minhasPermissoes`
      // vem no detalhe — sem invalidar o detalhe a interface continuaria
      // oferecendo acoes com a matriz antiga.
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso(
        `${membro.usuario.nome} agora é ${ROTULO_PAPEL[membro.papel].toLowerCase()} do grupo.`,
      );
    },
  });
}

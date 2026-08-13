import { EstadoVazio } from '@/componentes/feedback';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface AbaConfiguracoesGrupoProps {
  grupo: ContaCompartilhadaDetalhe;
}

/** A aba só aparece para quem tem `podeEditar` (a pagina esconde a
 * propria aba), mas o conteudo tambem se protege: um link direto com
 * `?aba=configuracoes` nao deve mostrar configuracao a quem nao
 * administra. A protecao que vale, de todo modo, e' a do servidor —
 * PATCH/DELETE do grupo exigem ADMINISTRADOR (RN-30). */
export function AbaConfiguracoesGrupo({ grupo }: AbaConfiguracoesGrupoProps): ReactElement {
  if (!grupo.minhasPermissoes.podeEditar) {
    return <EstadoVazio titulo="Somente o administrador acessa as configurações do grupo." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-3 rounded-lg border border-borda bg-superficie p-4">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-sm text-textoSuave">Moeda</dt>
          <dd className="text-sm font-medium text-texto">{grupo.moeda}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-sm text-textoSuave">
            Participantes podem editar os próprios lançamentos
          </dt>
          <dd className="text-sm font-medium text-texto">
            {grupo.permiteParticipanteEditarProprias ? 'Sim' : 'Não'}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-textoSuave">
        Editar nome, descrição, cor e permissões, além de excluir o grupo, chega na próxima etapa
        (issue #76).
      </p>
    </div>
  );
}

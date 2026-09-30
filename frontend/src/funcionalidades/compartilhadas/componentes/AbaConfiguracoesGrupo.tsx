import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstadoVazio } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { DialogoExcluirGrupo } from './DialogoExcluirGrupo';
import { FormularioEdicaoGrupo } from './FormularioEdicaoGrupo';
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
  const navigate = useNavigate();
  const [excluindo, setExcluindo] = useState(false);

  if (!grupo.minhasPermissoes.podeEditar) {
    return <EstadoVazio titulo="Somente o administrador acessa as configurações do grupo." />;
  }

  const membrosAtivos = grupo.membros.filter((membro) => membro.situacao === 'ATIVO').length;

  return (
    <div className="flex flex-col gap-4">
      <FormularioEdicaoGrupo grupo={grupo} />

      <dl className="flex flex-col gap-3 rounded-lg border border-borda bg-superficie p-4">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-sm text-textoSuave">Moeda</dt>
          <dd className="text-sm font-medium text-texto">{grupo.moeda}</dd>
        </div>
        <p className="text-xs text-textoSuave">
          A moeda é definida na criação e não muda: os lançamentos do grupo já estão registrados
          nela.
        </p>
      </dl>

      {grupo.minhasPermissoes.podeExcluir ? (
        <div className="flex flex-col gap-2 rounded-lg border border-perigo/40 p-4">
          <h3 className="text-sm font-semibold text-perigo">Excluir o grupo</h3>
          <p className="text-sm text-textoSuave">
            Todos os membros perdem o acesso ao grupo, às contas e aos lançamentos dele. O histórico
            fica preservado para auditoria (RN-33), mas não há como reabrir o grupo pela interface.
          </p>
          <Botao
            variante="perigo"
            className="self-start"
            onClick={() => {
              setExcluindo(true);
            }}
          >
            Excluir grupo
          </Botao>
        </div>
      ) : null}

      <DialogoExcluirGrupo
        grupoId={grupo.id}
        nomeGrupo={grupo.nome}
        quantidadeMembros={membrosAtivos}
        aberto={excluindo}
        aoFechar={() => {
          setExcluindo(false);
        }}
        aoExcluir={() => {
          setExcluindo(false);
          void navigate('/compartilhadas');
        }}
      />
    </div>
  );
}

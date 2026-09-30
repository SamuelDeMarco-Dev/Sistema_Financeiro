import { useParams } from 'react-router-dom';
import { Esqueleto, EstadoErro } from '@/componentes/feedback';
import { Abas, PainelAba } from '@/componentes/ui/Abas';
import type { DefinicaoAba } from '@/componentes/ui/Abas';
import { AbaAuditoriaGrupo } from '@/funcionalidades/compartilhadas/componentes/AbaAuditoriaGrupo';
import { AbaCategoriasGrupo } from '@/funcionalidades/compartilhadas/componentes/AbaCategoriasGrupo';
import { AbaConfiguracoesGrupo } from '@/funcionalidades/compartilhadas/componentes/AbaConfiguracoesGrupo';
import { AbaContasGrupo } from '@/funcionalidades/compartilhadas/componentes/AbaContasGrupo';
import { AbaMembrosGrupo } from '@/funcionalidades/compartilhadas/componentes/AbaMembrosGrupo';
import { AbaMovimentacoesGrupo } from '@/funcionalidades/compartilhadas/componentes/AbaMovimentacoesGrupo';
import { CabecalhoGrupo } from '@/funcionalidades/compartilhadas/componentes/CabecalhoGrupo';
import {
  useAbaGrupoUrl,
  ROTULO_ABA_GRUPO,
} from '@/funcionalidades/compartilhadas/hooks/useAbaGrupoUrl';
import type { AbaGrupo } from '@/funcionalidades/compartilhadas/hooks/useAbaGrupoUrl';
import { useContaCompartilhada } from '@/funcionalidades/compartilhadas/hooks/useContaCompartilhada';
import type { ReactElement } from 'react';

/** Auditoria e Configurações só existem para quem administra
 * (`podeVerAuditoria`/`podeEditar` vêm resolvidos do servidor). As demais
 * valem para qualquer membro ativo — nao membro nem chega aqui, o detalhe
 * responde 404 (RN-51). */
const ABAS_DE_ADMINISTRADOR: readonly AbaGrupo[] = ['auditoria', 'configuracoes'];

export function DetalheCompartilhada(): ReactElement {
  const { id = '' } = useParams<{ id: string }>();
  const { data: grupo, isLoading, isError, refetch } = useContaCompartilhada(id);
  const { aba, definirAba } = useAbaGrupoUrl();

  if (isLoading) {
    return (
      <div aria-hidden="true" className="mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6">
        <Esqueleto className="h-20 w-full" />
        <Esqueleto className="h-10 w-full" />
        <Esqueleto className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !grupo) {
    return (
      <div className="mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6">
        <EstadoErro
          mensagem="Grupo não encontrado ou você não faz parte dele."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  const visiveis: DefinicaoAba[] = (
    ['movimentacoes', 'contas', 'membros', 'categorias', 'auditoria', 'configuracoes'] as const
  )
    .filter((idAba) => {
      if (idAba === 'configuracoes') return grupo.minhasPermissoes.podeEditar;
      if (idAba === 'auditoria') return grupo.minhasPermissoes.podeVerAuditoria;
      return true;
    })
    .map((idAba) => ({ id: idAba, rotulo: ROTULO_ABA_GRUPO[idAba] }));

  // Um link direto para uma aba que este papel nao ve (ou um papel que
  // mudou desde que o link foi salvo) cai em Movimentacoes, em vez de
  // mostrar um painel vazio sem aba selecionada.
  const abaEfetiva: AbaGrupo =
    ABAS_DE_ADMINISTRADOR.includes(aba) && !visiveis.some((item) => item.id === aba)
      ? 'movimentacoes'
      : aba;

  return (
    <div className="mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6">
      <CabecalhoGrupo grupo={grupo} />

      <div className="min-w-0">
        <Abas
          abas={visiveis}
          abaAtiva={abaEfetiva}
          aoAlterar={(proxima) => {
            definirAba(proxima as AbaGrupo);
          }}
          rotuloLista={`Abas do grupo ${grupo.nome}`}
          prefixo="aba-grupo"
        />

        <PainelAba id="movimentacoes" abaAtiva={abaEfetiva} prefixo="aba-grupo">
          <AbaMovimentacoesGrupo grupo={grupo} />
        </PainelAba>
        <PainelAba id="contas" abaAtiva={abaEfetiva} prefixo="aba-grupo">
          <AbaContasGrupo grupo={grupo} />
        </PainelAba>
        <PainelAba id="membros" abaAtiva={abaEfetiva} prefixo="aba-grupo">
          <AbaMembrosGrupo grupo={grupo} />
        </PainelAba>
        <PainelAba id="categorias" abaAtiva={abaEfetiva} prefixo="aba-grupo">
          <AbaCategoriasGrupo grupo={grupo} />
        </PainelAba>
        {grupo.minhasPermissoes.podeVerAuditoria ? (
          <PainelAba id="auditoria" abaAtiva={abaEfetiva} prefixo="aba-grupo">
            <AbaAuditoriaGrupo />
          </PainelAba>
        ) : null}
        {grupo.minhasPermissoes.podeEditar ? (
          <PainelAba id="configuracoes" abaAtiva={abaEfetiva} prefixo="aba-grupo">
            <AbaConfiguracoesGrupo grupo={grupo} />
          </PainelAba>
        ) : null}
      </div>
    </div>
  );
}

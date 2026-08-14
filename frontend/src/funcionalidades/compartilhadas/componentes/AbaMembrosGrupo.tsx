import { LogOut, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Botao } from '@/componentes/ui/Botao';
import { ItemMenuAcoes, MenuAcoes } from '@/componentes/ui/MenuAcoes';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import { formatarDataBr } from '@/utilitarios/data';
import { DialogoAlterarPapel } from './DialogoAlterarPapel';
import { DialogoConvite } from './DialogoConvite';
import { DialogoRemoverMembro } from './DialogoRemoverMembro';
import { DialogoSairDoGrupo } from './DialogoSairDoGrupo';
import { DialogoTransferirAdministracao } from './DialogoTransferirAdministracao';
import { ListaConvitesEnviados } from './ListaConvitesEnviados';
import { SeloPapel } from './SeloPapel';
import { DESCRICAO_PAPEL } from '../tipos/conta-compartilhada';
import type { ContaCompartilhadaDetalhe, MembroDoGrupo } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface AbaMembrosGrupoProps {
  grupo: ContaCompartilhadaDetalhe;
}

type DialogoAberto = 'convidar' | 'transferir' | 'sair' | null;

/** RF-54 a RF-57. Toda ação de administração aparece conforme
 * `minhasPermissoes.podeGerenciarMembros`/`podeConvidar` — decisão do
 * servidor, lida aqui, nunca recalculada. O servidor recusa de novo em cada
 * rota; isto é apenas a interface não oferecer o que seria negado. */
export function AbaMembrosGrupo({ grupo }: AbaMembrosGrupoProps): ReactElement {
  const navigate = useNavigate();
  const { usuario } = useSessao();
  const [dialogo, setDialogo] = useState<DialogoAberto>(null);
  const [aAlterar, setAAlterar] = useState<MembroDoGrupo | null>(null);
  const [aRemover, setARemover] = useState<MembroDoGrupo | null>(null);

  const ativos = grupo.membros.filter((membro) => membro.situacao === 'ATIVO');
  const podeAdministrar = grupo.minhasPermissoes.podeGerenciarMembros;
  const ehAdministrador = grupo.meuPapel === 'ADMINISTRADOR';

  // Candidatos a receber a administração: membros ativos que não sou eu.
  // Comparo pelo id do usuário da sessão, não pelo papel, porque o
  // administrador é justamente quem está transferindo.
  const candidatos = ativos.filter((membro) => membro.usuario.id !== usuario?.id);

  function sairDaTela(): void {
    void navigate('/compartilhadas');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {podeAdministrar ? (
          <Botao
            onClick={() => {
              setDialogo('convidar');
            }}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Convidar membro
          </Botao>
        ) : (
          <p className="text-sm text-textoSuave">
            Somente o administrador do grupo convida, remove membros ou altera papéis.
          </p>
        )}

        <Botao
          variante="secundaria"
          onClick={() => {
            setDialogo('sair');
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair do grupo
        </Botao>
      </div>

      <ListaConvitesEnviados
        grupoId={grupo.id}
        podeAdministrar={grupo.minhasPermissoes.podeConvidar}
      />

      <ul className="flex flex-col gap-2">
        {ativos.map((membro) => {
          const souEu = membro.usuario.id === usuario?.id;
          // O administrador não altera o próprio papel nem se remove por
          // aqui: as duas rotas recusariam (RN-28/RN-29), e a saída dele é
          // a transferência.
          const temAcoes = podeAdministrar && !souEu && membro.papel !== 'ADMINISTRADOR';

          return (
            <li
              key={membro.id}
              className="flex min-w-0 items-center gap-3 rounded-md border border-borda bg-superficie p-3"
            >
              {membro.usuario.fotoUrl ? (
                <img
                  src={membro.usuario.fotoUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full border border-borda object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primaria/10 text-sm font-semibold text-primaria"
                >
                  {membro.usuario.nome.trim().charAt(0).toUpperCase()}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-texto">
                  {membro.usuario.nome}
                  {souEu ? <span className="text-textoSuave"> (você)</span> : null}
                </p>
                <p className="truncate text-sm text-textoSuave">{membro.usuario.email}</p>
                <p className="text-xs text-textoSuave">
                  No grupo desde {formatarDataBr(membro.entrouEm.slice(0, 10))}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <SeloPapel papel={membro.papel} />
                <span className="hidden max-w-[16rem] text-right text-xs text-textoSuave md:block">
                  {DESCRICAO_PAPEL[membro.papel]}
                </span>
              </div>

              {temAcoes ? (
                <MenuAcoes rotuloGatilho={`Ações para ${membro.usuario.nome}`}>
                  <ItemMenuAcoes
                    onSelect={() => {
                      setAAlterar(membro);
                    }}
                  >
                    Alterar papel
                  </ItemMenuAcoes>
                  <ItemMenuAcoes
                    perigo
                    onSelect={() => {
                      setARemover(membro);
                    }}
                  >
                    Remover do grupo
                  </ItemMenuAcoes>
                </MenuAcoes>
              ) : null}
            </li>
          );
        })}
      </ul>

      {ehAdministrador ? (
        <div className="flex flex-col gap-2 rounded-lg border border-borda p-4">
          <h3 className="text-sm font-semibold text-texto">Administração do grupo</h3>
          <p className="text-sm text-textoSuave">
            O grupo tem um único administrador. Transferir passa a administração a outro membro e
            deixa você como participante — é o passo necessário antes de você sair do grupo.
          </p>
          <Botao
            variante="secundaria"
            className="self-start"
            onClick={() => {
              setDialogo('transferir');
            }}
          >
            Transferir administração
          </Botao>
        </div>
      ) : null}

      <DialogoConvite
        grupoId={grupo.id}
        nomeGrupo={grupo.nome}
        aberto={dialogo === 'convidar'}
        aoFechar={() => {
          setDialogo(null);
        }}
      />

      <DialogoTransferirAdministracao
        grupoId={grupo.id}
        candidatos={candidatos}
        aberto={dialogo === 'transferir'}
        aoFechar={() => {
          setDialogo(null);
        }}
      />

      <DialogoSairDoGrupo
        grupoId={grupo.id}
        nomeGrupo={grupo.nome}
        ehAdministrador={ehAdministrador}
        aberto={dialogo === 'sair'}
        aoFechar={() => {
          setDialogo(null);
        }}
        aoTransferir={() => {
          setDialogo('transferir');
        }}
        aoSair={sairDaTela}
      />

      {/* Montados só com um membro escolhido: cada diálogo carrega o estado
          inicial daquele membro, e um componente sempre montado guardaria o
          papel de quem foi aberto antes. */}
      {aAlterar ? (
        <DialogoAlterarPapel
          grupoId={grupo.id}
          membro={aAlterar}
          aberto
          aoFechar={() => {
            setAAlterar(null);
          }}
        />
      ) : null}

      {aRemover ? (
        <DialogoRemoverMembro
          grupoId={grupo.id}
          membro={aRemover}
          aberto
          aoFechar={() => {
            setARemover(null);
          }}
        />
      ) : null}
    </div>
  );
}

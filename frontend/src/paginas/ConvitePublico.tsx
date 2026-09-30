import { Link, useParams } from 'react-router-dom';
import { Carregando } from '@/componentes/feedback';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import { SeloPapel } from '@/funcionalidades/compartilhadas/componentes/SeloPapel';
import { useConvitePrevia } from '@/funcionalidades/compartilhadas/hooks/useConvitePrevia';
import { DESCRICAO_PAPEL } from '@/funcionalidades/compartilhadas/tipos/conta-compartilhada';
import { ROTULO_SITUACAO_CONVITE } from '@/funcionalidades/compartilhadas/tipos/convite';
import { rotuloValidadeConvite } from '@/funcionalidades/compartilhadas/utilitarios/validade-convite';
import type { ReactElement } from 'react';

const CLASSE_LINK =
  'font-medium text-primaria hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria';

/** Página do link que chega por e-mail (RF-54/RN-37). Funciona sem sessão,
 * porque o convidado pode ainda não ter cadastro — e mostra apenas o que a
 * prévia pública devolve (04-API.md §17.3): nome do grupo, quem convidou,
 * papel e validade. Nenhum dado financeiro, nenhum membro, e-mail mascarado
 * pelo servidor: o token viaja por e-mail e pode acabar em outras mãos.
 *
 * O aceite não acontece aqui: exige sessão e é feito por id do convite
 * (§17.4), então a página encaminha para entrar/cadastrar, e o convite
 * espera em Compartilhadas. */
export function ConvitePublico(): ReactElement {
  const { token = '' } = useParams<{ token: string }>();
  const { data: convite, isLoading, isError } = useConvitePrevia(token);
  const { estaAutenticado } = useSessao();

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
        <Carregando rotulo="Carregando convite..." />
      </div>
    );
  }

  if (isError || !convite) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-8 text-center">
        <h1 className="text-lg font-semibold text-perigo">Convite indisponível</h1>
        <p className="text-sm text-textoSuave">
          Este link não é mais válido. Convites valem 7 dias (e podem ter sido cancelados). Peça um
          novo convite a quem administra o grupo.
        </p>
        <Link to="/entrar" className={CLASSE_LINK}>
          Ir para o login
        </Link>
      </div>
    );
  }

  const pendente = convite.situacao === 'PENDENTE';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6 text-center">
        <p className="text-sm text-textoSuave">
          <strong className="font-semibold text-texto">{convite.enviadoPor.nome}</strong> te
          convidou para
        </p>
        <h1 className="text-xl font-semibold text-texto">{convite.contaCompartilhada.nome}</h1>

        <div className="flex flex-col items-center gap-2">
          <SeloPapel papel={convite.papel} />
          <p className="text-xs text-textoSuave">{DESCRICAO_PAPEL[convite.papel]}</p>
        </div>

        <p className="text-sm text-textoSuave">
          Convite enviado para{' '}
          <span className="font-medium text-texto">{convite.emailConvidado}</span>
        </p>

        {pendente ? (
          <p className="text-sm text-textoSuave">{rotuloValidadeConvite(convite.expiraEm)}</p>
        ) : (
          <p className="rounded-md bg-perigo/10 p-3 text-sm text-perigo">
            Este convite está {ROTULO_SITUACAO_CONVITE[convite.situacao].toLowerCase()} e não pode
            mais ser aceito.
          </p>
        )}
      </div>

      {pendente ? (
        <div className="flex flex-col gap-3 text-center">
          {estaAutenticado ? (
            <>
              <p className="text-sm text-textoSuave">
                Você já está com a sessão aberta. O convite aparece em Compartilhadas, onde você
                aceita ou recusa.
              </p>
              <Link to="/compartilhadas" className={CLASSE_LINK}>
                Ver meus convites
              </Link>
            </>
          ) : convite.requerCadastro ? (
            <>
              <p className="text-sm text-textoSuave">
                Esse e-mail ainda não tem conta aqui. Crie a sua com o mesmo e-mail do convite: ele
                estará esperando em Compartilhadas.
              </p>
              <Link to="/cadastrar" className={CLASSE_LINK}>
                Criar minha conta
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-textoSuave">
                Entre com o e-mail do convite para aceitar. Ele estará em Compartilhadas.
              </p>
              <Link to="/entrar" className={CLASSE_LINK}>
                Entrar para aceitar
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

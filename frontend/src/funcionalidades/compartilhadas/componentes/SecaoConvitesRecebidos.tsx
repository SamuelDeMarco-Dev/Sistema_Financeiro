import { Botao } from '@/componentes/ui/Botao';
import { ImagemGrupo } from './ImagemGrupo';
import { SeloPapel } from './SeloPapel';
import { useAceitarConvite } from '../hooks/useAceitarConvite';
import { useConvitesRecebidos } from '../hooks/useConvitesRecebidos';
import { useRecusarConvite } from '../hooks/useRecusarConvite';
import { rotuloValidadeConvite } from '../utilitarios/validade-convite';
import type { ReactElement } from 'react';

/** Convites pendentes vem primeiro na tela e com destaque de cor: e' a
 * unica parte da pagina com prazo — RN-35 expira o convite em 7 dias. */
export function SecaoConvitesRecebidos(): ReactElement | null {
  const { data: convites } = useConvitesRecebidos();
  const aceitar = useAceitarConvite();
  const recusar = useRecusarConvite();

  const pendentes = (convites ?? []).filter((convite) => convite.situacao === 'PENDENTE');
  if (pendentes.length === 0) return null;

  return (
    <section
      aria-label="Convites recebidos"
      className="flex flex-col gap-3 rounded-lg border border-primaria/40 bg-primaria/5 p-4"
    >
      <h2 className="text-sm font-semibold text-texto">
        {pendentes.length === 1 ? 'Você tem 1 convite' : `Você tem ${pendentes.length} convites`}
      </h2>

      <ul className="flex flex-col gap-3">
        {pendentes.map((convite) => {
          const emAndamento =
            (aceitar.isPending && aceitar.variables === convite.id) ||
            (recusar.isPending && recusar.variables === convite.id);

          return (
            <li
              key={convite.id}
              className="flex min-w-0 flex-col gap-3 rounded-md border border-borda bg-superficie p-3 md:flex-row md:items-center"
            >
              <ImagemGrupo
                nome={convite.contaCompartilhada.nome}
                imagemUrl={convite.contaCompartilhada.imagemUrl}
                className="h-10 w-10"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-texto">{convite.contaCompartilhada.nome}</p>
                <p className="truncate text-sm text-textoSuave">
                  {convite.enviadoPor.nome} te convidou ·{' '}
                  {convite.contaCompartilhada.quantidadeMembros}{' '}
                  {convite.contaCompartilhada.quantidadeMembros === 1 ? 'membro' : 'membros'}
                </p>
                {convite.mensagem ? (
                  <p className="mt-1 truncate text-sm italic text-textoSuave">
                    “{convite.mensagem}”
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-start gap-1 md:items-end">
                <SeloPapel papel={convite.papel} />
                <span className="text-xs text-textoSuave">
                  {rotuloValidadeConvite(convite.expiraEm)}
                </span>
              </div>

              <div className="flex shrink-0 gap-2">
                <Botao
                  carregando={aceitar.isPending && aceitar.variables === convite.id}
                  disabled={emAndamento}
                  onClick={() => {
                    aceitar.mutate(convite.id);
                  }}
                >
                  Aceitar
                </Botao>
                <Botao
                  variante="secundaria"
                  carregando={recusar.isPending && recusar.variables === convite.id}
                  disabled={emAndamento}
                  onClick={() => {
                    recusar.mutate(convite.id);
                  }}
                >
                  Recusar
                </Botao>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

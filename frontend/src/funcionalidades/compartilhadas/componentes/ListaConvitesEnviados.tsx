import { useState } from 'react';
import { Botao } from '@/componentes/ui/Botao';
import { DialogoConfirmacao } from '@/componentes/ui/DialogoConfirmacao';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { SeloPapel } from './SeloPapel';
import { useCancelarConvite } from '../hooks/useCancelarConvite';
import { useConvitesDoGrupo } from '../hooks/useConvitesDoGrupo';
import { diasAteExpirar, rotuloValidadeConvite } from '../utilitarios/validade-convite';
import type { ConviteDoGrupo } from '../tipos/convite';
import type { ReactElement } from 'react';

interface ListaConvitesEnviadosProps {
  grupoId: string;
  /** `podeConvidar`, vindo de `minhasPermissoes` — a rota de listagem exige
   * ADMINISTRADOR, então sem isso a consulta não deve nem sair. */
  podeAdministrar: boolean;
}

/** RN-35: o convite vale 7 dias. A validade aparece em cada linha porque um
 * convite prestes a expirar exige ação diferente de um recém-enviado — e um
 * já expirado explica sozinho por que ninguém entrou no grupo. */
export function ListaConvitesEnviados({
  grupoId,
  podeAdministrar,
}: ListaConvitesEnviadosProps): ReactElement | null {
  const { data: convites, isLoading } = useConvitesDoGrupo(grupoId, podeAdministrar);
  const cancelar = useCancelarConvite(grupoId);
  const [aCancelar, setACancelar] = useState<ConviteDoGrupo | null>(null);

  if (!podeAdministrar) return null;

  // Só os pendentes: recusados, aceitos e cancelados são histórico, e o
  // histórico do grupo tem lugar próprio na aba Auditoria.
  const pendentes = (convites ?? []).filter((convite) => convite.situacao === 'PENDENTE');

  if (isLoading || pendentes.length === 0) return null;

  return (
    <section aria-label="Convites enviados" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-texto">
        {pendentes.length === 1
          ? '1 convite aguardando resposta'
          : `${pendentes.length} convites aguardando resposta`}
      </h3>

      <ul className="flex flex-col gap-2">
        {pendentes.map((convite) => {
          const expirado = diasAteExpirar(convite.expiraEm) <= 0;

          return (
            <li
              key={convite.id}
              className="sm:flex-row sm:items-center flex min-w-0 flex-col gap-2 rounded-md border border-dashed border-borda bg-superficie p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-texto">{convite.email}</p>
                <p className="text-xs text-textoSuave">
                  <span className={expirado ? 'text-perigo' : undefined}>
                    {rotuloValidadeConvite(convite.expiraEm)}
                  </span>
                  {expirado ? ' — envie um novo convite' : null}
                </p>
              </div>

              <SeloPapel papel={convite.papel} />

              <Botao
                variante="secundaria"
                className="shrink-0"
                onClick={() => {
                  setACancelar(convite);
                }}
              >
                Cancelar convite
              </Botao>
            </li>
          );
        })}
      </ul>

      <DialogoConfirmacao
        aberto={aCancelar !== null}
        aoFechar={() => {
          setACancelar(null);
          cancelar.reset();
        }}
        titulo="Cancelar convite"
        descricao={
          <>
            O convite para <strong className="font-semibold text-texto">{aCancelar?.email}</strong>{' '}
            deixa de valer e o link enviado não poderá mais ser aceito. Você pode convidar esse
            e-mail novamente depois.
          </>
        }
        rotuloConfirmar="Cancelar convite"
        variante="perigo"
        carregando={cancelar.isPending}
        erro={cancelar.error ? traduzirErroApi(cancelar.error) : undefined}
        aoConfirmar={() => {
          if (!aCancelar) return;
          cancelar.mutate(aCancelar.id, {
            onSuccess: () => {
              setACancelar(null);
            },
          });
        }}
      />
    </section>
  );
}

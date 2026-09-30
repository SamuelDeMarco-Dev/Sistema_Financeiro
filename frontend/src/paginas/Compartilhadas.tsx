import { useState } from 'react';
import { Esqueleto, EstadoErro } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { CartaoGrupo } from '@/funcionalidades/compartilhadas/componentes/CartaoGrupo';
import { EstadoVazioCompartilhadas } from '@/funcionalidades/compartilhadas/componentes/EstadoVazioCompartilhadas';
import { FormularioGrupo } from '@/funcionalidades/compartilhadas/componentes/FormularioGrupo';
import { SecaoConvitesRecebidos } from '@/funcionalidades/compartilhadas/componentes/SecaoConvitesRecebidos';
import { useContasCompartilhadas } from '@/funcionalidades/compartilhadas/hooks/useContasCompartilhadas';
import type { ReactElement } from 'react';

function EsqueletoGradeGrupos(): ReactElement {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, indice) => (
        <Esqueleto key={indice} className="h-40 w-full" />
      ))}
    </div>
  );
}

export function Compartilhadas(): ReactElement {
  const { data: grupos, isLoading, isError, refetch } = useContasCompartilhadas();
  const [formularioAberto, setFormularioAberto] = useState(false);

  function abrirCriacao(): void {
    setFormularioAberto(true);
  }

  const semNenhumGrupo = !isLoading && !isError && (grupos ?? []).length === 0;

  return (
    <div className="mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-texto">Compartilhadas</h1>
        <Botao onClick={abrirCriacao}>Novo grupo</Botao>
      </header>

      <SecaoConvitesRecebidos />

      {isLoading ? <EsqueletoGradeGrupos /> : null}

      {isError ? (
        <EstadoErro
          mensagem="Não foi possível carregar seus grupos."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      ) : null}

      {semNenhumGrupo ? <EstadoVazioCompartilhadas aoCriar={abrirCriacao} /> : null}

      {grupos && grupos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grupos.map((grupo) => (
            <li key={grupo.id} className="min-w-0">
              <CartaoGrupo grupo={grupo} />
            </li>
          ))}
        </ul>
      ) : null}

      <FormularioGrupo
        aberto={formularioAberto}
        aoFechar={() => {
          setFormularioAberto(false);
        }}
      />
    </div>
  );
}

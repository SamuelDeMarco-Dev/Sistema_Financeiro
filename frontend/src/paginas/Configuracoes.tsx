import { useState } from 'react';
import { AbaPerfil } from '@/componentes/configuracoes/AbaPerfil';
import { AbaPreferencias } from '@/componentes/configuracoes/AbaPreferencias';
import { AbaSeguranca } from '@/componentes/configuracoes/AbaSeguranca';
import { Carregando, EstadoErro } from '@/componentes/feedback';
import { usePerfil } from '@/hooks/usePerfil';
import type { KeyboardEvent, ReactElement } from 'react';

const ABAS = [
  { id: 'perfil', rotulo: 'Perfil' },
  { id: 'preferencias', rotulo: 'Preferências' },
  { id: 'seguranca', rotulo: 'Segurança' },
] as const;

type IdAba = (typeof ABAS)[number]['id'];

export function Configuracoes(): ReactElement {
  const { data: perfil, isLoading, isError, refetch } = usePerfil();
  const [abaAtiva, setAbaAtiva] = useState<IdAba>('perfil');

  // Padrao WAI-ARIA de abas: setas move o foco E a selecao entre os
  // botoes da tablist (A11Y-02 — operavel por teclado, ordem logica).
  function aoNavegarComTeclado(evento: KeyboardEvent<HTMLDivElement>): void {
    const indiceAtual = ABAS.findIndex((aba) => aba.id === abaAtiva);
    let proximoIndice: number | null = null;

    if (evento.key === 'ArrowRight') proximoIndice = (indiceAtual + 1) % ABAS.length;
    else if (evento.key === 'ArrowLeft')
      proximoIndice = (indiceAtual - 1 + ABAS.length) % ABAS.length;
    else if (evento.key === 'Home') proximoIndice = 0;
    else if (evento.key === 'End') proximoIndice = ABAS.length - 1;

    if (proximoIndice === null) return;
    evento.preventDefault();
    const proximaAba = ABAS[proximoIndice];
    if (!proximaAba) return;
    setAbaAtiva(proximaAba.id);
    document.getElementById(`aba-${proximaAba.id}`)?.focus();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-texto">Configurações</h1>

      {isLoading ? <Carregando rotulo="Carregando configurações..." /> : null}

      {isError ? (
        <EstadoErro
          mensagem="Não foi possível carregar suas configurações."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      ) : null}

      {perfil ? (
        <>
          <div
            role="tablist"
            aria-label="Seções de configurações"
            onKeyDown={aoNavegarComTeclado}
            // tabIndex -1: o padrao WAI-ARIA de abas usa "roving tabindex"
            // nos botoes-filho (cada um com seu proprio tabIndex 0/-1), nao
            // na tablist em si — isto so satisfaz a regra de a11y que exige
            // foco em elemento com role interativo, sem criar uma parada de
            // tab extra.
            tabIndex={-1}
            className="flex gap-1 border-b border-borda"
          >
            {ABAS.map((aba) => (
              <button
                key={aba.id}
                id={`aba-${aba.id}`}
                type="button"
                role="tab"
                aria-selected={abaAtiva === aba.id}
                aria-controls={`painel-${aba.id}`}
                tabIndex={abaAtiva === aba.id ? 0 : -1}
                onClick={() => {
                  setAbaAtiva(aba.id);
                }}
                className={
                  abaAtiva === aba.id
                    ? 'border-b-2 border-primaria px-4 py-2 text-sm font-semibold text-primaria'
                    : 'border-b-2 border-transparent px-4 py-2 text-sm font-medium text-textoSuave hover:text-texto'
                }
              >
                {aba.rotulo}
              </button>
            ))}
          </div>

          <div
            id="painel-perfil"
            role="tabpanel"
            aria-labelledby="aba-perfil"
            hidden={abaAtiva !== 'perfil'}
          >
            {abaAtiva === 'perfil' ? <AbaPerfil perfil={perfil} /> : null}
          </div>
          <div
            id="painel-preferencias"
            role="tabpanel"
            aria-labelledby="aba-preferencias"
            hidden={abaAtiva !== 'preferencias'}
          >
            {abaAtiva === 'preferencias' ? <AbaPreferencias perfil={perfil} /> : null}
          </div>
          <div
            id="painel-seguranca"
            role="tabpanel"
            aria-labelledby="aba-seguranca"
            hidden={abaAtiva !== 'seguranca'}
          >
            {abaAtiva === 'seguranca' ? <AbaSeguranca /> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

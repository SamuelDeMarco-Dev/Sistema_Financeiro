import { useNavigate } from 'react-router-dom';
import { Botao } from '@/componentes/ui/Botao';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import type { ReactElement } from 'react';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

export function Cabecalho(): ReactElement {
  const { usuario, sair } = useSessao();
  const navigate = useNavigate();

  async function aoSair(): Promise<void> {
    await sair();
    void navigate('/entrar', { replace: true });
  }

  return (
    <header className="flex items-center justify-between border-b border-borda bg-superficie px-4 py-3 md:px-8 print:hidden">
      <span className="text-lg font-semibold text-texto">Gerenciador de Finanças</span>

      {usuario ? (
        <div className="flex items-center gap-3">
          {usuario.perfil.fotoUrl ? (
            <img
              src={usuario.perfil.fotoUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primaria/10 text-xs font-semibold text-primaria"
            >
              {iniciais(usuario.nome)}
            </span>
          )}
          <span className="sm:inline hidden text-sm font-medium text-texto">{usuario.nome}</span>
          <Botao
            variante="secundaria"
            onClick={() => {
              void aoSair();
            }}
          >
            Sair
          </Botao>
        </div>
      ) : null}
    </header>
  );
}

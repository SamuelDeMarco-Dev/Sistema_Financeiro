import { useEffect, useState } from 'react';
import { cn } from '@/utilitarios/cn';
import { inscrever, removerNotificacao } from './notificar';
import type { Notificacao } from './notificar';
import type { ReactElement } from 'react';

/** Regiao aria-live unica para toda a aplicacao — monte uma vez perto da
 * raiz (main.tsx). Leitores de tela anunciam cada notificacao ao ser
 * inserida no DOM (A11Y-03). */
export function ContainerNotificacoes(): ReactElement {
  const [lista, setLista] = useState<Notificacao[]>([]);

  useEffect(() => inscrever(setLista), []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {lista.map((notificacao) => (
        <div
          key={notificacao.id}
          role="status"
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start justify-between gap-3 rounded-md border bg-superficie px-4 py-3 text-sm text-texto shadow-lg',
            notificacao.tipo === 'sucesso' ? 'border-sucesso' : 'border-perigo',
          )}
        >
          <span>{notificacao.mensagem}</span>
          <button
            type="button"
            onClick={() => {
              removerNotificacao(notificacao.id);
            }}
            aria-label="Fechar notificacao"
            className="text-textoSuave hover:text-texto"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

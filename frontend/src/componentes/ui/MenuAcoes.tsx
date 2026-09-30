import * as MenuPrimitivo from '@radix-ui/react-dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/utilitarios/cn';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';

interface MenuAcoesProps {
  rotuloGatilho: string;
  children: ReactNode;
}

/** Menu de acoes em "..." — usado nos cartoes de lista (conta, categoria)
 * para abrir editar/arquivar/excluir sem poluir o cartao com N botoes. */
export function MenuAcoes({ rotuloGatilho, children }: MenuAcoesProps): ReactElement {
  return (
    <MenuPrimitivo.Root>
      <MenuPrimitivo.Trigger
        aria-label={rotuloGatilho}
        className="flex h-9 w-9 items-center justify-center rounded-md text-textoSuave transition-colors hover:bg-borda hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </MenuPrimitivo.Trigger>
      <MenuPrimitivo.Portal>
        <MenuPrimitivo.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[10rem] rounded-md border border-borda bg-fundo p-1 shadow-lg"
        >
          {children}
        </MenuPrimitivo.Content>
      </MenuPrimitivo.Portal>
    </MenuPrimitivo.Root>
  );
}

export function ItemMenuAcoes({
  className,
  perigo,
  ...props
}: ComponentPropsWithoutRef<typeof MenuPrimitivo.Item> & { perigo?: boolean }): ReactElement {
  return (
    <MenuPrimitivo.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-texto outline-none transition-colors',
        'data-[highlighted]:bg-borda',
        perigo && 'text-perigo data-[highlighted]:bg-perigo/10',
        className,
      )}
      {...props}
    />
  );
}

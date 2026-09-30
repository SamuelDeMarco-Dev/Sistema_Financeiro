import * as PopoverPrimitivo from '@radix-ui/react-popover';
import { cn } from '@/utilitarios/cn';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

export const Popover = PopoverPrimitivo.Root;
export const PopoverGatilho = PopoverPrimitivo.Trigger;
export const PopoverFechar = PopoverPrimitivo.Close;
export const PopoverAncora = PopoverPrimitivo.Anchor;

export function PopoverConteudo({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitivo.Content>): ReactElement {
  return (
    <PopoverPrimitivo.Portal>
      <PopoverPrimitivo.Content
        sideOffset={4}
        className={cn(
          'z-50 rounded-md border border-borda bg-fundo p-3 shadow-lg focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitivo.Content>
    </PopoverPrimitivo.Portal>
  );
}

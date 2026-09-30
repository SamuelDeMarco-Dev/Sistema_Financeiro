import * as SelectPrimitivo from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utilitarios/cn';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';

export const Select = SelectPrimitivo.Root;
export const SelectGrupo = SelectPrimitivo.Group;
export const SelectValor = SelectPrimitivo.Value;

export function SelectGatilho({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitivo.Trigger>): ReactElement {
  return (
    <SelectPrimitivo.Trigger
      className={cn(
        'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border border-borda bg-superficie px-3 py-2 text-left text-texto',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
        'data-[placeholder]:text-textoSuave',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitivo.Icon>
        <ChevronDown className="h-4 w-4 shrink-0 text-textoSuave" aria-hidden="true" />
      </SelectPrimitivo.Icon>
    </SelectPrimitivo.Trigger>
  );
}

export function SelectConteudo({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitivo.Content>): ReactElement {
  return (
    <SelectPrimitivo.Portal>
      <SelectPrimitivo.Content
        position="popper"
        sideOffset={4}
        className={cn(
          'z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-borda bg-fundo shadow-lg',
          className,
        )}
        {...props}
      >
        <SelectPrimitivo.Viewport className="p-1">{children}</SelectPrimitivo.Viewport>
      </SelectPrimitivo.Content>
    </SelectPrimitivo.Portal>
  );
}

export function SelectRotuloGrupo({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitivo.Label>): ReactElement {
  return (
    <SelectPrimitivo.Label
      className={cn('px-2 py-1.5 text-xs font-semibold text-textoSuave', className)}
      {...props}
    />
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitivo.Item> & { children: ReactNode }): ReactElement {
  return (
    <SelectPrimitivo.Item
      className={cn(
        'flex min-h-[44px] cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm text-texto outline-none',
        'data-[highlighted]:bg-borda',
        className,
      )}
      {...props}
    >
      <SelectPrimitivo.ItemText>{children}</SelectPrimitivo.ItemText>
      <SelectPrimitivo.ItemIndicator className="ml-auto">
        <Check className="h-4 w-4 text-primaria" aria-hidden="true" />
      </SelectPrimitivo.ItemIndicator>
    </SelectPrimitivo.Item>
  );
}

interface CarregandoProps {
  rotulo?: string;
}

export function Carregando({ rotulo = 'Carregando...' }: CarregandoProps): JSX.Element {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-8 text-textoSuave">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-borda border-t-primaria"
      />
      <span className="text-sm">{rotulo}</span>
    </div>
  );
}

interface EstadoErroProps {
  mensagem: string;
  onTentarNovamente?: () => void;
}

export function EstadoErro({ mensagem, onTentarNovamente }: EstadoErroProps): JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-perigo bg-superficie px-6 py-10 text-center"
    >
      <p className="font-semibold text-perigo">Algo deu errado</p>
      <p className="text-sm text-textoSuave">{mensagem}</p>
      {onTentarNovamente ? (
        <button
          type="button"
          onClick={onTentarNovamente}
          className="mt-2 rounded-md border border-borda px-3 py-2 text-sm font-medium text-texto transition-colors hover:bg-borda"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

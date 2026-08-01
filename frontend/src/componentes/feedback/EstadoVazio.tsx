interface EstadoVazioProps {
  titulo: string;
  descricao?: string;
  acao?: {
    rotulo: string;
    onClick: () => void;
  };
}

export function EstadoVazio({ titulo, descricao, acao }: EstadoVazioProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-borda bg-superficie px-6 py-10 text-center">
      <p className="font-semibold text-texto">{titulo}</p>
      {descricao ? <p className="text-sm text-textoSuave">{descricao}</p> : null}
      {acao ? (
        <button
          type="button"
          onClick={acao.onClick}
          className="mt-2 rounded-md border border-primaria px-3 py-2 text-sm font-medium text-primaria transition-colors hover:bg-primaria/10"
        >
          {acao.rotulo}
        </button>
      ) : null}
    </div>
  );
}

export function NaoEncontrada(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-fundo px-4 text-center text-texto">
      <p className="text-3xl font-semibold">404</p>
      <p className="text-textoSuave">Página não encontrada.</p>
    </div>
  );
}

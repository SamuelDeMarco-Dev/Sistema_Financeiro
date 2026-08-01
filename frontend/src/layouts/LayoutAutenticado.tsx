import { Outlet } from 'react-router-dom';

// Cabecalho e MenuLateral chegam com as issues que constroem a casca
// autenticada (componentes/layout/). Por ora, so o espaco de conteudo.
export function LayoutAutenticado(): JSX.Element {
  return (
    <div className="flex min-h-screen bg-fundo text-texto">
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

import { Outlet } from 'react-router-dom';

export function LayoutPublico(): JSX.Element {
  return (
    <div className="min-h-screen bg-fundo text-texto">
      <Outlet />
    </div>
  );
}

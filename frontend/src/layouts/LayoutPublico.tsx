import { Outlet } from 'react-router-dom';
import type { ReactElement } from 'react';

export function LayoutPublico(): ReactElement {
  return (
    <div className="min-h-screen bg-fundo text-texto">
      <Outlet />
    </div>
  );
}

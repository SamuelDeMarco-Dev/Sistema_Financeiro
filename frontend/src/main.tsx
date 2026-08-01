import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ContainerNotificacoes } from '@/componentes/feedback';
import { ProvedorTema } from '@/contextos/ContextoTema';
import { rotas } from '@/rotas';
import { clienteConsulta } from '@/servicos/cliente-consulta';
import '@/estilos/globais.css';

const elemento = document.getElementById('raiz');
if (!elemento) {
  throw new Error('Elemento #raiz nao encontrado em index.html.');
}

createRoot(elemento).render(
  <StrictMode>
    <ProvedorTema>
      <QueryClientProvider client={clienteConsulta}>
        <RouterProvider router={rotas} />
        <ContainerNotificacoes />
      </QueryClientProvider>
    </ProvedorTema>
  </StrictMode>,
);

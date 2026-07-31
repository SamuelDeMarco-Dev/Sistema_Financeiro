import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProvedorTema } from '@/contextos/ContextoTema';
import '@/estilos/globais.css';

const elemento = document.getElementById('raiz');
if (!elemento) {
  throw new Error('Elemento #raiz nao encontrado em index.html.');
}

createRoot(elemento).render(
  <StrictMode>
    <ProvedorTema>
      <App />
    </ProvedorTema>
  </StrictMode>,
);

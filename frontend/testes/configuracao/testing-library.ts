import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem isto, componentes renderizados por um teste (render()) continuam no
// DOM do jsdom no proximo teste do mesmo arquivo — o RTL so faz isso sozinho
// quando detecta um `afterEach` GLOBAL, e vitest.config.ts nao usa
// `globals: true` neste projeto.
afterEach(() => {
  cleanup();
});

// jsdom declara estes metodos no seu tipo mas nao os implementa em runtime
// — o Radix Select (issue #30) os chama ao abrir/fechar e ao rolar itens
// para dentro da viewport, o que derruba os testes com "is not a function".
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => undefined;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.scrollIntoView = () => undefined;

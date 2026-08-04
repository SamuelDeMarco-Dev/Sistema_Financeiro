import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem isto, componentes renderizados por um teste (render()) continuam no
// DOM do jsdom no proximo teste do mesmo arquivo — o RTL so faz isso sozinho
// quando detecta um `afterEach` GLOBAL, e vitest.config.ts nao usa
// `globals: true` neste projeto.
afterEach(() => {
  cleanup();
});

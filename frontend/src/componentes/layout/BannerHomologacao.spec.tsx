import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BannerHomologacao } from './BannerHomologacao';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('BannerHomologacao', () => {
  it('mostra o aviso quando VITE_AMBIENTE é staging', () => {
    vi.stubEnv('VITE_AMBIENTE', 'staging');

    render(<BannerHomologacao />);

    expect(screen.getByText(/AMBIENTE DE HOMOLOGAÇÃO/)).toBeTruthy();
  });

  it('não renderiza nada em produção', () => {
    vi.stubEnv('VITE_AMBIENTE', 'production');

    const { container } = render(<BannerHomologacao />);

    expect(container.innerHTML).toBe('');
  });
});

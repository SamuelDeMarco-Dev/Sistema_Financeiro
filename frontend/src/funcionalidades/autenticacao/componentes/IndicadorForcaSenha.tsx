import { cn } from '@/utilitarios/cn';
import { calcularForcaSenha } from '@/utilitarios/forca-senha';
import type { NivelForcaSenha } from '@/utilitarios/forca-senha';
import type { ReactElement } from 'react';

interface IndicadorForcaSenhaProps {
  senha: string;
}

const CORES: Record<NivelForcaSenha, string> = {
  FRACA: 'bg-perigo',
  MEDIA: 'bg-atencao',
  FORTE: 'bg-sucesso',
  MUITO_FORTE: 'bg-sucesso',
};

const TOTAL_BARRAS = 4;

// A cor nunca e o unico portador da informacao (A11Y-01): o rotulo textual
// ("Fraca"/"Forte"/...) acompanha as barras e e' o que um leitor de tela anuncia.
export function IndicadorForcaSenha({ senha }: IndicadorForcaSenhaProps): ReactElement | null {
  if (senha.length === 0) {
    return null;
  }

  const { pontuacao, nivel, rotulo } = calcularForcaSenha(senha);
  const barrasPreenchidas = Math.min(Math.ceil((pontuacao / 5) * TOTAL_BARRAS), TOTAL_BARRAS);

  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: TOTAL_BARRAS }, (_, indice) => (
          <span
            key={indice}
            className={cn(
              'h-1 flex-1 rounded-full',
              indice < barrasPreenchidas ? CORES[nivel] : 'bg-borda',
            )}
          />
        ))}
      </div>
      <p className="text-sm text-textoSuave">
        Força da senha: <span className="font-medium text-texto">{rotulo}</span>
      </p>
    </div>
  );
}

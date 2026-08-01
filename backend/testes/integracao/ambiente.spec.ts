import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const DIRETORIO_BACKEND = fileURLToPath(new URL('../..', import.meta.url));

// Importar configuracao/ambiente.ts diretamente executaria process.exit(1)
// no PROPRIO processo de teste quando a configuracao for invalida — por
// isso este teste roda em um subprocesso real (o mesmo tipo de falha que
// aconteceria ao subir a aplicacao com configuracao incompleta).
function rodarComAmbiente(env: NodeJS.ProcessEnv): { status: number | null; stderr: string } {
  const resultado = spawnSync('npx', ['tsx', 'src/configuracao/ambiente.ts'], {
    cwd: DIRETORIO_BACKEND,
    env: { ...env },
    encoding: 'utf-8',
    shell: true,
  });

  return { status: resultado.status, stderr: resultado.stderr };
}

const AMBIENTE_BASE = {
  PATH: process.env['PATH'],
  URL_BASE_API: 'http://localhost:3333',
  URL_BASE_FRONTEND: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://pfm:pfm_local@localhost:5432/pfm?schema=public',
  ORIGENS_PERMITIDAS: 'http://localhost:5173',
};

describe('configuracao/ambiente (validacao na inicializacao)', () => {
  it('aborta com codigo de saida 1 e mensagem clara quando JWT_SEGREDO esta ausente', () => {
    const { status, stderr } = rodarComAmbiente(AMBIENTE_BASE);

    expect(status).toBe(1);
    expect(stderr).toContain('JWT_SEGREDO');
  });

  it('inicia normalmente (saida 0) quando todas as variaveis obrigatorias estao presentes', () => {
    const { status } = rodarComAmbiente({
      ...AMBIENTE_BASE,
      JWT_SEGREDO: 'x'.repeat(32),
    });

    expect(status).toBe(0);
  });
});

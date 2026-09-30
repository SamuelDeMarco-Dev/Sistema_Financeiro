import { ambiente } from '@/configuracao/ambiente';

const MAX_AMOSTRAS = 1000;

// Coletor em memoria, por processo — cada instancia do cluster PM2 (issue
// #56) reporta so o proprio trafego, sem agregacao entre processos. E
// suficiente para "esta instancia esta lenta/errando" via inspecao manual.
// A issue #125 (M11) constroi em cima disto: formato Prometheus, janela
// deslizante de 1h, metricas de tarefas e do pool do banco, alerta
// automatico — nada disso e escopo de #64, que so estabelece a rota
// protegida com o essencial (contagem, latencia, taxa de erro).
let latenciasMs: number[] = [];
let totalRequisicoes = 0;
let totalErros = 0;

export function registrarRequisicao(duracaoMs: number, statusHttp: number): void {
  totalRequisicoes += 1;
  if (statusHttp >= 500) totalErros += 1;

  latenciasMs.push(duracaoMs);
  if (latenciasMs.length > MAX_AMOSTRAS) latenciasMs.shift();
}

function percentil(ordenadas: number[], p: number): number {
  if (ordenadas.length === 0) return 0;
  const indice = Math.min(ordenadas.length - 1, Math.ceil((p / 100) * ordenadas.length) - 1);
  return Math.round((ordenadas[indice] ?? 0) * 100) / 100;
}

export interface Metricas {
  processoId: number;
  instanciaPm2: string;
  totalRequisicoes: number;
  totalErros: number;
  taxaErro: number;
  latenciaMs: { p50: number; p95: number; p99: number };
}

export function obterMetricas(): Metricas {
  const ordenadas = [...latenciasMs].sort((a, b) => a - b);

  return {
    processoId: process.pid,
    instanciaPm2: ambiente.NODE_APP_INSTANCE,
    totalRequisicoes,
    totalErros,
    taxaErro:
      totalRequisicoes === 0 ? 0 : Math.round((totalErros / totalRequisicoes) * 10000) / 10000,
    latenciaMs: {
      p50: percentil(ordenadas, 50),
      p95: percentil(ordenadas, 95),
      p99: percentil(ordenadas, 99),
    },
  };
}

/** Só para testes: o coletor é estado de módulo compartilhado por processo. */
export function reiniciarMetricas(): void {
  latenciasMs = [];
  totalRequisicoes = 0;
  totalErros = 0;
}

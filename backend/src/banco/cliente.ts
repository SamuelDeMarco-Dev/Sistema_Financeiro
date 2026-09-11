import os from 'node:os';
import { PrismaClient } from '@prisma/client';
import { ambiente } from '@/configuracao/ambiente';
import { registrador } from '@/utilitarios/registrador';

const MAX_CONEXOES_POSTGRES = 100; // docker-compose.prod.yml: max_connections=100
const CONEXOES_RESERVADAS = 20; // migrations, psql manual, monitoramento
const CONEXOES_MINIMAS_POR_INSTANCIA = 2;

// PM2 sobe uma instancia por nucleo (ecosystem.config.cjs `instances: 'max'`,
// issue #56), CADA UMA com seu proprio PrismaClient e seu proprio pool. Sem
// `connection_limit` explicito, o Prisma usa `nucleos*2+1` POR INSTANCIA —
// numa VPS de 8 nucleos isso da 8 x 17 = 136 conexoes, estourando o
// `max_connections=100` do Postgres sob carga (issue #64, "pool de conexoes
// nao esgota com N instancias PM2"). Dividir o orcamento pelo numero de
// instancias mantem o total dentro do limite, seja qual for o tamanho da VPS.
export function urlComPoolDimensionado(url: string): string {
  const analisada = new URL(url);
  const nucleos = os.cpus().length;
  const porInstancia = Math.max(
    CONEXOES_MINIMAS_POR_INSTANCIA,
    Math.floor((MAX_CONEXOES_POSTGRES - CONEXOES_RESERVADAS) / nucleos),
  );
  analisada.searchParams.set('connection_limit', String(porInstancia));
  return analisada.toString();
}

// Instancia unica por processo: o driver do Postgres gerencia seu proprio
// pool de conexoes, e multiplas instancias no mesmo processo esgotariam esse
// pool inutilmente.
export const prisma = new PrismaClient({
  datasourceUrl: urlComPoolDimensionado(ambiente.DATABASE_URL),
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

// O evento "query" traz apenas o SQL parametrizado ($1, $2, ...), nunca os
// valores — esses ficam em `params`, que nao e lido aqui de proposito, pois
// pode conter senha_hash/tokens/e-mails. So emitido em development, para nao
// gerar volume/custo em producao.
if (ambiente.NODE_ENV === 'development') {
  prisma.$on('query', (evento) => {
    registrador.debug({ query: evento.query, duracaoMs: evento.duration }, 'Consulta Prisma');
  });
}

prisma.$on('warn', (evento) => {
  registrador.warn({ prisma: evento.message }, 'Aviso do Prisma');
});
prisma.$on('error', (evento) => {
  registrador.error({ prisma: evento.message }, 'Erro do Prisma');
});

import { PrismaClient } from '@prisma/client';
import { ambiente } from '@/configuracao/ambiente';
import { registrador } from '@/utilitarios/registrador';

// Instancia unica: o driver do Postgres gerencia seu proprio pool de
// conexoes, e multiplas instancias esgotariam esse pool.
export const prisma = new PrismaClient({
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

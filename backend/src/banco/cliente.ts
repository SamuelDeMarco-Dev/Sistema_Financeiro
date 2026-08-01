import { PrismaClient } from '@prisma/client';

// Instancia unica: o driver do Postgres gerencia seu proprio pool de
// conexoes, e multiplas instancias esgotariam esse pool.
export const prisma = new PrismaClient();

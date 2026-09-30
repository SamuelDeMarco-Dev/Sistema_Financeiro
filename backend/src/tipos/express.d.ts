// Aumenta o Request do Express com o requestId (middleware de correlacao),
// o usuario autenticado (middlewares/autenticar.middleware.ts) e o vinculo
// com a conta compartilhada da rota (middlewares/autorizar-compartilhada.
// middleware.ts, 02-ARCHITECTURE.md §8.3 nivel 2) — disponiveis em todo
// handler downstream sem precisar redeclarar o tipo em cada arquivo.
declare namespace Express {
  interface Request {
    requestId: string;
    usuario: {
      id: string;
      email: string;
      nome: string;
    };
    membro: import('@prisma/client').MembroCompartilhado;
  }
}

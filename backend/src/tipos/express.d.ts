// Aumenta o Request do Express com o requestId (middleware de correlacao)
// e o usuario autenticado (middlewares/autenticar.middleware.ts) —
// disponiveis em todo handler downstream sem precisar redeclarar o tipo em
// cada arquivo.
declare namespace Express {
  interface Request {
    requestId: string;
    usuario: {
      id: string;
      email: string;
    };
  }
}

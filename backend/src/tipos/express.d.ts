// Aumenta o Request do Express com o requestId atribuido pelo middleware de
// correlacao — disponivel em todo handler downstream sem precisar
// redeclarar o tipo em cada arquivo.
declare namespace Express {
  interface Request {
    requestId: string;
  }
}

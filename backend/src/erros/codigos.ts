// Catalogo completo de 04-API.md §3.2. Nem todo codigo tem uma classe de
// erro dedicada ainda — os mais especificos (ex.: TOKEN_EXPIRADO,
// CONVITE_DUPLICADO) chegam com subclasses de ErroAplicacao nas issues de
// dominio que os produzem (ex.: autenticacao, convites).
export const CODIGOS_ERRO = [
  'VALIDACAO',
  'NAO_AUTENTICADO',
  'TOKEN_EXPIRADO',
  'CREDENCIAIS_INVALIDAS',
  'EMAIL_NAO_VERIFICADO',
  'CONTA_BLOQUEADA',
  'PROIBIDO',
  'PAPEL_INSUFICIENTE',
  'NAO_ENCONTRADO',
  'CONFLITO',
  'EMAIL_JA_CADASTRADO',
  'RECURSO_EM_USO',
  'CONVITE_DUPLICADO',
  'JA_E_MEMBRO',
  'ARQUIVO_MUITO_GRANDE',
  'TIPO_ARQUIVO_INVALIDO',
  'REGRA_NEGOCIO',
  'SALDO_INSUFICIENTE',
  'CONTAS_IGUAIS',
  'CATEGORIA_INCOMPATIVEL',
  'CONTA_ARQUIVADA',
  'CONVITE_EXPIRADO',
  'ADMINISTRADOR_UNICO',
  'LIMITE_EXCEDIDO',
  'ERRO_INTERNO',
  'SERVICO_INDISPONIVEL',
] as const;

export type CodigoErro = (typeof CODIGOS_ERRO)[number];

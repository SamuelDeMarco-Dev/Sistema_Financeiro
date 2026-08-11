import type { MembroComUsuario } from '@/repositorios/membro-compartilhado.repositorio';
import type { PermissoesGrupo } from '@/utilitarios/resolver-permissoes';
import type { ContaCompartilhada, PapelMembro, SituacaoMembro, TipoConta } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export interface ResumoMesDTO {
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
  resultado: Prisma.Decimal;
}

export interface ContaCompartilhadaListaItemDTO {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  moeda: string;
  cor: string;
  permiteParticipanteEditarProprias: boolean;
  meuPapel: PapelMembro;
  saldoTotal: Prisma.Decimal;
  quantidadeMembros: number;
  quantidadeContas: number;
  resumoMesAtual: ResumoMesDTO;
  criadoEm: Date;
}

export interface MembroDoGrupoDTO {
  id: string;
  papel: PapelMembro;
  situacao: SituacaoMembro;
  entrouEm: Date;
  usuario: { id: string; nome: string; email: string; fotoUrl: string | null };
}

export interface ContaDoGrupoDTO {
  id: string;
  nome: string;
  tipo: TipoConta;
  saldoAtual: Prisma.Decimal;
  cor: string;
  icone: string;
}

export interface ContaCompartilhadaDetalheDTO {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  moeda: string;
  cor: string;
  permiteParticipanteEditarProprias: boolean;
  meuPapel: PapelMembro;
  minhasPermissoes: PermissoesGrupo;
  saldoTotal: Prisma.Decimal;
  membros: MembroDoGrupoDTO[];
  contas: ContaDoGrupoDTO[];
  criadoEm: Date;
}

/** 04-API.md §16.1: `meuPapel` sempre presente para o frontend decidir
 * controles sem uma segunda requisicao. */
export function mapearContaCompartilhadaLista(
  grupo: ContaCompartilhada,
  meuPapel: PapelMembro,
  saldoTotal: Prisma.Decimal,
  quantidadeMembros: number,
  quantidadeContas: number,
  resumoMesAtual: ResumoMesDTO,
): ContaCompartilhadaListaItemDTO {
  return {
    id: grupo.id,
    nome: grupo.nome,
    descricao: grupo.descricao,
    imagemUrl: grupo.imagemUrl,
    moeda: grupo.moeda,
    cor: grupo.cor,
    permiteParticipanteEditarProprias: grupo.permiteParticipanteEditarProprias,
    meuPapel,
    saldoTotal,
    quantidadeMembros,
    quantidadeContas,
    resumoMesAtual,
    criadoEm: grupo.criadoEm,
  };
}

/** 04-API.md §16.3: `minhasPermissoes` e a matriz RN-30/RN-31 ja resolvida
 * — o frontend consome a decisao, nao a reimplementa (issue #67). */
export function mapearContaCompartilhadaDetalhe(
  grupo: ContaCompartilhada,
  meuPapel: PapelMembro,
  minhasPermissoes: PermissoesGrupo,
  saldoTotal: Prisma.Decimal,
  membros: MembroComUsuario[],
  contas: ContaDoGrupoDTO[],
): ContaCompartilhadaDetalheDTO {
  return {
    id: grupo.id,
    nome: grupo.nome,
    descricao: grupo.descricao,
    imagemUrl: grupo.imagemUrl,
    moeda: grupo.moeda,
    cor: grupo.cor,
    permiteParticipanteEditarProprias: grupo.permiteParticipanteEditarProprias,
    meuPapel,
    minhasPermissoes,
    saldoTotal,
    membros: membros.map((membro) => ({
      id: membro.id,
      papel: membro.papel,
      situacao: membro.situacao,
      entrouEm: membro.entrouEm,
      usuario: membro.usuario,
    })),
    contas,
    criadoEm: grupo.criadoEm,
  };
}

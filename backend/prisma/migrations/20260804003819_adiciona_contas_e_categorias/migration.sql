-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('CARTEIRA', 'CONTA_CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'DINHEIRO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('RECEITA', 'DESPESA', 'AMBOS');

-- CreateTable
CREATE TABLE "contas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "conta_compartilhada_id" TEXT,
    "nome" VARCHAR(120) NOT NULL,
    "tipo" "TipoConta" NOT NULL,
    "instituicao" VARCHAR(120),
    "saldo_inicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "moeda" CHAR(3) NOT NULL DEFAULT 'BRL',
    "cor" VARCHAR(9) NOT NULL DEFAULT '#2563EB',
    "icone" VARCHAR(40) NOT NULL DEFAULT 'wallet',
    "incluir_no_saldo_total" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "arquivada_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "conta_compartilhada_id" TEXT,
    "categoria_pai_id" TEXT,
    "nome" VARCHAR(80) NOT NULL,
    "tipo" "TipoCategoria" NOT NULL DEFAULT 'DESPESA',
    "cor" VARCHAR(9) NOT NULL DEFAULT '#64748B',
    "icone" VARCHAR(40) NOT NULL DEFAULT 'tag',
    "eh_padrao_sistema" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "conta_compartilhada_id" TEXT,
    "nome" VARCHAR(40) NOT NULL,
    "cor" VARCHAR(9) NOT NULL DEFAULT '#64748B',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_usuario_id_excluido_em_arquivada_em_idx" ON "contas"("usuario_id", "excluido_em", "arquivada_em");

-- CreateIndex
CREATE INDEX "contas_conta_compartilhada_id_excluido_em_idx" ON "contas"("conta_compartilhada_id", "excluido_em");

-- CreateIndex
CREATE INDEX "categorias_usuario_id_tipo_excluido_em_idx" ON "categorias"("usuario_id", "tipo", "excluido_em");

-- CreateIndex
CREATE INDEX "categorias_conta_compartilhada_id_tipo_excluido_em_idx" ON "categorias"("conta_compartilhada_id", "tipo", "excluido_em");

-- CreateIndex
CREATE INDEX "categorias_categoria_pai_id_idx" ON "categorias"("categoria_pai_id");

-- CreateIndex
CREATE INDEX "etiquetas_usuario_id_idx" ON "etiquetas"("usuario_id");

-- CreateIndex
CREATE INDEX "etiquetas_conta_compartilhada_id_idx" ON "etiquetas"("conta_compartilhada_id");

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_categoria_pai_id_fkey" FOREIGN KEY ("categoria_pai_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════
--  CHECKS DE ESCOPO — forma parcial (só usuario_id).
--  conta_compartilhada_id ja existe na coluna, mas sem FK ativa e sem
--  caminho para preenche-la ate M6 — a migration 6 recria estes CHECK
--  na forma completa (XOR usuario_id / conta_compartilhada_id) de
--  03-DATABASE.md §6.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE "contas" ADD CONSTRAINT "chk_conta_escopo" CHECK ("usuario_id" IS NOT NULL);

-- Categoria admite o terceiro caso: padrao global do sistema (sem usuario).
ALTER TABLE "categorias" ADD CONSTRAINT "chk_categoria_escopo" CHECK (
  ("usuario_id" IS NOT NULL AND "eh_padrao_sistema" = false) OR
  ("usuario_id" IS NULL AND "eh_padrao_sistema" = true)
);

ALTER TABLE "etiquetas" ADD CONSTRAINT "chk_etiqueta_escopo" CHECK ("usuario_id" IS NOT NULL);

-- ═══════════════════════════════════════════════════════════
--  UNICIDADE PARCIAL POR ESCOPO  (NULL nao colide em UNIQUE do Postgres)
-- ═══════════════════════════════════════════════════════════

-- Nome de conta unico por usuario, ignorando excluidas.
CREATE UNIQUE INDEX "uq_conta_nome_usuario"
  ON "contas" ("usuario_id", lower("nome"))
  WHERE "usuario_id" IS NOT NULL AND "excluido_em" IS NULL;

-- Nome de categoria unico por usuario e por pai (subcategorias do mesmo
-- nome sob pais diferentes nao colidem).
CREATE UNIQUE INDEX "uq_categoria_nome_usuario"
  ON "categorias" ("usuario_id", coalesce("categoria_pai_id", ''), lower("nome"))
  WHERE "usuario_id" IS NOT NULL AND "excluido_em" IS NULL;

-- Etiqueta unica por usuario.
CREATE UNIQUE INDEX "uq_etiqueta_nome_usuario"
  ON "etiquetas" ("usuario_id", lower("nome"))
  WHERE "usuario_id" IS NOT NULL;

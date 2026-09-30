-- CreateEnum
CREATE TYPE "PapelMembro" AS ENUM ('ADMINISTRADOR', 'PARTICIPANTE', 'OBSERVADOR');

-- CreateEnum
CREATE TYPE "SituacaoMembro" AS ENUM ('ATIVO', 'REMOVIDO', 'SAIU');

-- CreateEnum
CREATE TYPE "SituacaoConvite" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO', 'CANCELADO', 'EXPIRADO');

-- CreateTable
CREATE TABLE "contas_compartilhadas" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" VARCHAR(500),
    "imagem_url" VARCHAR(500),
    "moeda" CHAR(3) NOT NULL DEFAULT 'BRL',
    "cor" VARCHAR(9) NOT NULL DEFAULT '#2563EB',
    "permite_participante_editar_proprias" BOOLEAN NOT NULL DEFAULT true,
    "criado_por_id" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "contas_compartilhadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_compartilhados" (
    "id" TEXT NOT NULL,
    "conta_compartilhada_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "papel" "PapelMembro" NOT NULL DEFAULT 'PARTICIPANTE',
    "situacao" "SituacaoMembro" NOT NULL DEFAULT 'ATIVO',
    "entrou_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiu_em" TIMESTAMPTZ(3),
    "convidado_por_id" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "membros_compartilhados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convites" (
    "id" TEXT NOT NULL,
    "conta_compartilhada_id" TEXT NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "papel" "PapelMembro" NOT NULL DEFAULT 'PARTICIPANTE',
    "token" VARCHAR(128) NOT NULL,
    "situacao" "SituacaoConvite" NOT NULL DEFAULT 'PENDENTE',
    "mensagem" VARCHAR(300),
    "enviado_por_id" TEXT NOT NULL,
    "usuario_convidado_id" TEXT,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "respondido_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_compartilhadas_criado_por_id_idx" ON "contas_compartilhadas"("criado_por_id");

-- CreateIndex
CREATE INDEX "contas_compartilhadas_excluido_em_idx" ON "contas_compartilhadas"("excluido_em");

-- CreateIndex
CREATE INDEX "membros_compartilhados_usuario_id_situacao_idx" ON "membros_compartilhados"("usuario_id", "situacao");

-- CreateIndex
CREATE INDEX "membros_compartilhados_conta_compartilhada_id_papel_idx" ON "membros_compartilhados"("conta_compartilhada_id", "papel");

-- CreateIndex
CREATE UNIQUE INDEX "membros_compartilhados_conta_compartilhada_id_usuario_id_key" ON "membros_compartilhados"("conta_compartilhada_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "convites_token_key" ON "convites"("token");

-- CreateIndex
CREATE INDEX "convites_email_situacao_idx" ON "convites"("email", "situacao");

-- CreateIndex
CREATE INDEX "convites_conta_compartilhada_id_situacao_idx" ON "convites"("conta_compartilhada_id", "situacao");

-- CreateIndex
CREATE INDEX "convites_expira_em_idx" ON "convites"("expira_em");

-- AddForeignKey
ALTER TABLE "contas_compartilhadas" ADD CONSTRAINT "contas_compartilhadas_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_compartilhados" ADD CONSTRAINT "membros_compartilhados_conta_compartilhada_id_fkey" FOREIGN KEY ("conta_compartilhada_id") REFERENCES "contas_compartilhadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_compartilhados" ADD CONSTRAINT "membros_compartilhados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_compartilhados" ADD CONSTRAINT "membros_compartilhados_convidado_por_id_fkey" FOREIGN KEY ("convidado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_conta_compartilhada_id_fkey" FOREIGN KEY ("conta_compartilhada_id") REFERENCES "contas_compartilhadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_usuario_convidado_id_fkey" FOREIGN KEY ("usuario_convidado_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_conta_compartilhada_id_fkey" FOREIGN KEY ("conta_compartilhada_id") REFERENCES "contas_compartilhadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_conta_compartilhada_id_fkey" FOREIGN KEY ("conta_compartilhada_id") REFERENCES "contas_compartilhadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_conta_compartilhada_id_fkey" FOREIGN KEY ("conta_compartilhada_id") REFERENCES "contas_compartilhadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_conta_compartilhada_id_fkey" FOREIGN KEY ("conta_compartilhada_id") REFERENCES "contas_compartilhadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════
--  CHECKS DE ESCOPO — forma completa (XOR pessoal / grupo),
--  substituindo os parciais de M2/M3 (03-DATABASE.md §6).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE "movimentacoes" DROP CONSTRAINT "chk_mov_escopo";
ALTER TABLE "contas" DROP CONSTRAINT "chk_conta_escopo";
ALTER TABLE "categorias" DROP CONSTRAINT "chk_categoria_escopo";
ALTER TABLE "etiquetas" DROP CONSTRAINT "chk_etiqueta_escopo";

-- RN-09
ALTER TABLE "movimentacoes" ADD CONSTRAINT "chk_mov_escopo" CHECK (
  ("conta_id" IS NOT NULL AND "conta_compartilhada_id" IS NULL) OR
  ("conta_id" IS NULL AND "conta_compartilhada_id" IS NOT NULL)
);

ALTER TABLE "contas" ADD CONSTRAINT "chk_conta_escopo" CHECK (
  ("usuario_id" IS NOT NULL AND "conta_compartilhada_id" IS NULL) OR
  ("usuario_id" IS NULL AND "conta_compartilhada_id" IS NOT NULL)
);

-- Categoria admite o terceiro caso: padrao global do sistema.
ALTER TABLE "categorias" ADD CONSTRAINT "chk_categoria_escopo" CHECK (
  ("usuario_id" IS NOT NULL AND "conta_compartilhada_id" IS NULL AND "eh_padrao_sistema" = false) OR
  ("usuario_id" IS NULL AND "conta_compartilhada_id" IS NOT NULL AND "eh_padrao_sistema" = false) OR
  ("usuario_id" IS NULL AND "conta_compartilhada_id" IS NULL AND "eh_padrao_sistema" = true)
);

ALTER TABLE "etiquetas" ADD CONSTRAINT "chk_etiqueta_escopo" CHECK (
  ("usuario_id" IS NOT NULL AND "conta_compartilhada_id" IS NULL) OR
  ("usuario_id" IS NULL AND "conta_compartilhada_id" IS NOT NULL)
);

-- ═══════════════════════════════════════════════════════════
--  UNICIDADE PARCIAL — recriando os indices de nome por escopo
--  para cobrir tambem a variante de grupo.
-- ═══════════════════════════════════════════════════════════

DROP INDEX "uq_conta_nome_usuario";
DROP INDEX "uq_categoria_nome_usuario";
DROP INDEX "uq_etiqueta_nome_usuario";

CREATE UNIQUE INDEX "uq_conta_nome_usuario"
  ON "contas" ("usuario_id", lower("nome"))
  WHERE "usuario_id" IS NOT NULL AND "excluido_em" IS NULL;

CREATE UNIQUE INDEX "uq_conta_nome_grupo"
  ON "contas" ("conta_compartilhada_id", lower("nome"))
  WHERE "conta_compartilhada_id" IS NOT NULL AND "excluido_em" IS NULL;

CREATE UNIQUE INDEX "uq_categoria_nome_usuario"
  ON "categorias" ("usuario_id", coalesce("categoria_pai_id", ''), lower("nome"))
  WHERE "usuario_id" IS NOT NULL AND "excluido_em" IS NULL;

CREATE UNIQUE INDEX "uq_categoria_nome_grupo"
  ON "categorias" ("conta_compartilhada_id", coalesce("categoria_pai_id", ''), lower("nome"))
  WHERE "conta_compartilhada_id" IS NOT NULL AND "excluido_em" IS NULL;

CREATE UNIQUE INDEX "uq_etiqueta_nome_usuario"
  ON "etiquetas" ("usuario_id", lower("nome"))
  WHERE "usuario_id" IS NOT NULL;

CREATE UNIQUE INDEX "uq_etiqueta_nome_grupo"
  ON "etiquetas" ("conta_compartilhada_id", lower("nome"))
  WHERE "conta_compartilhada_id" IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
--  UNICIDADE PARCIAL — regras exclusivas de contas compartilhadas
-- ═══════════════════════════════════════════════════════════

-- RN-36: no maximo um convite PENDENTE por e-mail e grupo.
CREATE UNIQUE INDEX "uq_convite_pendente"
  ON "convites" ("conta_compartilhada_id", lower("email"))
  WHERE "situacao" = 'PENDENTE';

-- RN-28: exatamente um ADMINISTRADOR ativo por grupo.
CREATE UNIQUE INDEX "uq_grupo_um_administrador"
  ON "membros_compartilhados" ("conta_compartilhada_id")
  WHERE "papel" = 'ADMINISTRADOR' AND "situacao" = 'ATIVO';

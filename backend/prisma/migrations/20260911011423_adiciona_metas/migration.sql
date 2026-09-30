-- CreateEnum
CREATE TYPE "SituacaoMeta" AS ENUM ('ATIVA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoMeta" AS ENUM ('APORTE', 'RESGATE');

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "conta_compartilhada_id" TEXT,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" VARCHAR(500),
    "valor_alvo" DECIMAL(14,2) NOT NULL,
    "valor_acumulado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "prazo_em" DATE,
    "cor" VARCHAR(9) NOT NULL DEFAULT '#16A34A',
    "icone" VARCHAR(40) NOT NULL DEFAULT 'target',
    "situacao" "SituacaoMeta" NOT NULL DEFAULT 'ATIVA',
    "concluida_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_meta" (
    "id" TEXT NOT NULL,
    "meta_id" TEXT NOT NULL,
    "conta_id" TEXT,
    "movimentacao_id" TEXT,
    "tipo" "TipoMovimentacaoMeta" NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "data" DATE NOT NULL,
    "observacao" VARCHAR(500),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metas_usuario_id_situacao_idx" ON "metas"("usuario_id", "situacao");

-- CreateIndex
CREATE INDEX "metas_conta_compartilhada_id_situacao_idx" ON "metas"("conta_compartilhada_id", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "movimentacoes_meta_movimentacao_id_key" ON "movimentacoes_meta"("movimentacao_id");

-- CreateIndex
CREATE INDEX "movimentacoes_meta_meta_id_data_idx" ON "movimentacoes_meta"("meta_id", "data");

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_conta_compartilhada_id_fkey" FOREIGN KEY ("conta_compartilhada_id") REFERENCES "contas_compartilhadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_meta" ADD CONSTRAINT "movimentacoes_meta_meta_id_fkey" FOREIGN KEY ("meta_id") REFERENCES "metas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_meta" ADD CONSTRAINT "movimentacoes_meta_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_meta" ADD CONSTRAINT "movimentacoes_meta_movimentacao_id_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════
--  CONSTRAINTS NAO EXPRESSAVEIS NO PRISMA (03-DATABASE.md §6)
-- ═══════════════════════════════════════════════════════════

-- RF-61: escopo XOR (pessoal OU compartilhado, nunca ambos, nunca nenhum).
ALTER TABLE "metas" ADD CONSTRAINT "chk_meta_escopo" CHECK (
  ("usuario_id" IS NOT NULL AND "conta_compartilhada_id" IS NULL) OR
  ("usuario_id" IS NULL     AND "conta_compartilhada_id" IS NOT NULL)
);

ALTER TABLE "metas" ADD CONSTRAINT "chk_meta_valor_alvo"
  CHECK ("valor_alvo" > 0);

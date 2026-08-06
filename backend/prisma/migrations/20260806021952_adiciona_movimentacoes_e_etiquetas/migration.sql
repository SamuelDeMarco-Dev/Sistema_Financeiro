-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('RECEITA', 'DESPESA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "SituacaoMovimentacao" AS ENUM ('PENDENTE', 'PAGA', 'PAGA_PARCIALMENTE', 'ATRASADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SentidoTransferencia" AS ENUM ('SAIDA', 'ENTRADA');

-- CreateEnum
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateTable
CREATE TABLE "movimentacoes_etiquetas" (
    "movimentacao_id" TEXT NOT NULL,
    "etiqueta_id" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_etiquetas_pkey" PRIMARY KEY ("movimentacao_id","etiqueta_id")
);

-- CreateTable
CREATE TABLE "compras_parceladas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "cartao_id" TEXT,
    "descricao" VARCHAR(200) NOT NULL,
    "valor_total" DECIMAL(14,2) NOT NULL,
    "total_parcelas" INTEGER NOT NULL,
    "data_compra" DATE NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "compras_parceladas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "conta_id" TEXT,
    "conta_compartilhada_id" TEXT,
    "categoria_id" TEXT,
    "tipo" "TipoMovimentacao" NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "observacao" VARCHAR(1000),
    "valor" DECIMAL(14,2) NOT NULL,
    "valor_pago" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "situacao" "SituacaoMovimentacao" NOT NULL DEFAULT 'PENDENTE',
    "data_competencia" DATE NOT NULL,
    "data_vencimento" DATE,
    "data_efetivacao" DATE,
    "transferencia_id" TEXT,
    "sentido" "SentidoTransferencia",
    "eh_modelo_recorrencia" BOOLEAN NOT NULL DEFAULT false,
    "recorrencia_id" TEXT,
    "frequencia" "FrequenciaRecorrencia",
    "intervalo_recorrencia" INTEGER,
    "recorrencia_fim_em" DATE,
    "recorrencia_total" INTEGER,
    "compra_parcelada_id" TEXT,
    "numero_parcela" INTEGER,
    "total_parcelas" INTEGER,
    "cartao_id" TEXT,
    "fatura_id" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "movimentacao_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nome_original" VARCHAR(255) NOT NULL,
    "nome_armazenado" VARCHAR(255) NOT NULL,
    "caminho" VARCHAR(500) NOT NULL,
    "tipo_mime" VARCHAR(100) NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimentacoes_etiquetas_etiqueta_id_idx" ON "movimentacoes_etiquetas"("etiqueta_id");

-- CreateIndex
CREATE INDEX "compras_parceladas_usuario_id_excluido_em_idx" ON "compras_parceladas"("usuario_id", "excluido_em");

-- CreateIndex
CREATE INDEX "compras_parceladas_cartao_id_idx" ON "compras_parceladas"("cartao_id");

-- CreateIndex
CREATE INDEX "movimentacoes_conta_id_situacao_data_efetivacao_idx" ON "movimentacoes"("conta_id", "situacao", "data_efetivacao");

-- CreateIndex
CREATE INDEX "movimentacoes_usuario_id_data_competencia_tipo_idx" ON "movimentacoes"("usuario_id", "data_competencia", "tipo");

-- CreateIndex
CREATE INDEX "movimentacoes_conta_compartilhada_id_data_competencia_idx" ON "movimentacoes"("conta_compartilhada_id", "data_competencia");

-- CreateIndex
CREATE INDEX "movimentacoes_categoria_id_data_competencia_idx" ON "movimentacoes"("categoria_id", "data_competencia");

-- CreateIndex
CREATE INDEX "movimentacoes_situacao_data_vencimento_idx" ON "movimentacoes"("situacao", "data_vencimento");

-- CreateIndex
CREATE INDEX "movimentacoes_transferencia_id_idx" ON "movimentacoes"("transferencia_id");

-- CreateIndex
CREATE INDEX "movimentacoes_recorrencia_id_idx" ON "movimentacoes"("recorrencia_id");

-- CreateIndex
CREATE INDEX "movimentacoes_compra_parcelada_id_idx" ON "movimentacoes"("compra_parcelada_id");

-- CreateIndex
CREATE INDEX "movimentacoes_fatura_id_idx" ON "movimentacoes"("fatura_id");

-- CreateIndex
CREATE INDEX "movimentacoes_excluido_em_idx" ON "movimentacoes"("excluido_em");

-- CreateIndex
CREATE INDEX "anexos_movimentacao_id_idx" ON "anexos"("movimentacao_id");

-- CreateIndex
CREATE INDEX "anexos_usuario_id_idx" ON "anexos"("usuario_id");

-- AddForeignKey
ALTER TABLE "movimentacoes_etiquetas" ADD CONSTRAINT "movimentacoes_etiquetas_movimentacao_id_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_etiquetas" ADD CONSTRAINT "movimentacoes_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_parceladas" ADD CONSTRAINT "compras_parceladas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_compra_parcelada_id_fkey" FOREIGN KEY ("compra_parcelada_id") REFERENCES "compras_parceladas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_recorrencia_id_fkey" FOREIGN KEY ("recorrencia_id") REFERENCES "movimentacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_movimentacao_id_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

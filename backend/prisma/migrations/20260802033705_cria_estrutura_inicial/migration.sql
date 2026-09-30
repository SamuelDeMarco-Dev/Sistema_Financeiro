-- CreateEnum
CREATE TYPE "TemaPreferido" AS ENUM ('CLARO', 'ESCURO', 'SISTEMA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "senha_hash" VARCHAR(72) NOT NULL,
    "email_verificado_em" TIMESTAMPTZ(3),
    "token_verificacao" VARCHAR(128),
    "token_verificacao_expira_em" TIMESTAMPTZ(3),
    "token_recuperacao" VARCHAR(128),
    "token_recuperacao_expira_em" TIMESTAMPTZ(3),
    "tentativas_login" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_ate" TIMESTAMPTZ(3),
    "ultimo_login_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),
    "anonimizado_em" TIMESTAMPTZ(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "foto_url" VARCHAR(500),
    "moeda_padrao" CHAR(3) NOT NULL DEFAULT 'BRL',
    "idioma" VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    "tema" "TemaPreferido" NOT NULL DEFAULT 'SISTEMA',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
    "formato_data" VARCHAR(20) NOT NULL DEFAULT 'dd/MM/yyyy',
    "primeiro_dia_semana" INTEGER NOT NULL DEFAULT 0,
    "notificacoes_app" BOOLEAN NOT NULL DEFAULT true,
    "notificacoes_email" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_renovacao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "dispositivo" VARCHAR(120),
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(300),
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "revogado_em" TIMESTAMPTZ(3),
    "substituido_por_id" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_renovacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_token_verificacao_key" ON "usuarios"("token_verificacao");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_token_recuperacao_key" ON "usuarios"("token_recuperacao");

-- CreateIndex
CREATE INDEX "usuarios_excluido_em_idx" ON "usuarios"("excluido_em");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_usuario_id_key" ON "perfis"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_renovacao_token_hash_key" ON "tokens_renovacao"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_renovacao_usuario_id_revogado_em_idx" ON "tokens_renovacao"("usuario_id", "revogado_em");

-- CreateIndex
CREATE INDEX "tokens_renovacao_expira_em_idx" ON "tokens_renovacao"("expira_em");

-- AddForeignKey
ALTER TABLE "perfis" ADD CONSTRAINT "perfis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_renovacao" ADD CONSTRAINT "tokens_renovacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

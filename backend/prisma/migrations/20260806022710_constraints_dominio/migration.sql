-- ═══════════════════════════════════════════════════════════
--  ESCOPO — forma parcial (so conta_id), igual ao padrao de M2.
--  conta_compartilhada_id ja existe na coluna, mas sem FK ativa e sem
--  caminho para preenche-la ate M6 — a migration de M6 recria este CHECK
--  na forma completa (XOR conta_id / conta_compartilhada_id) de
--  03-DATABASE.md §6.
-- ═══════════════════════════════════════════════════════════

-- RN-09
ALTER TABLE "movimentacoes" ADD CONSTRAINT "chk_mov_escopo" CHECK ("conta_id" IS NOT NULL);

-- ═══════════════════════════════════════════════════════════
--  INTEGRIDADE DE VALORES
-- ═══════════════════════════════════════════════════════════

-- RN-08
ALTER TABLE "movimentacoes" ADD CONSTRAINT "chk_mov_valor_positivo"
  CHECK ("valor" > 0);

ALTER TABLE "movimentacoes" ADD CONSTRAINT "chk_mov_valor_pago"
  CHECK ("valor_pago" >= 0 AND "valor_pago" <= "valor");

ALTER TABLE "compras_parceladas" ADD CONSTRAINT "chk_compra_parcelas"
  CHECK ("total_parcelas" >= 2 AND "valor_total" > 0);

-- ═══════════════════════════════════════════════════════════
--  COERENCIA DE ESTADO
-- ═══════════════════════════════════════════════════════════

-- `sentido` existe se e somente se for transferencia (ADR-007).
ALTER TABLE "movimentacoes" ADD CONSTRAINT "chk_mov_sentido_transferencia" CHECK (
  ("tipo" = 'TRANSFERENCIA' AND "sentido" IS NOT NULL AND "transferencia_id" IS NOT NULL) OR
  ("tipo" <> 'TRANSFERENCIA' AND "sentido" IS NULL AND "transferencia_id" IS NULL)
);

-- Efetivada exige data de efetivacao; pendente/atrasada/cancelada nao pode
-- te-la (RN-02, RN-14).
ALTER TABLE "movimentacoes" ADD CONSTRAINT "chk_mov_efetivacao" CHECK (
  ("situacao" IN ('PAGA', 'PAGA_PARCIALMENTE') AND "data_efetivacao" IS NOT NULL) OR
  ("situacao" IN ('PENDENTE', 'ATRASADA', 'CANCELADA') AND "data_efetivacao" IS NULL)
);

-- Parcelamento e tudo-ou-nada (RN-22).
ALTER TABLE "movimentacoes" ADD CONSTRAINT "chk_mov_parcelamento" CHECK (
  ("compra_parcelada_id" IS NULL AND "numero_parcela" IS NULL AND "total_parcelas" IS NULL) OR
  ("compra_parcelada_id" IS NOT NULL AND "numero_parcela" IS NOT NULL
   AND "total_parcelas" IS NOT NULL AND "numero_parcela" BETWEEN 1 AND "total_parcelas")
);

-- Modelo de recorrencia precisa de frequencia; e nao pode ser filho de
-- outro modelo (RN-17).
ALTER TABLE "movimentacoes" ADD CONSTRAINT "chk_mov_recorrencia" CHECK (
  ("eh_modelo_recorrencia" = false) OR
  ("eh_modelo_recorrencia" = true AND "frequencia" IS NOT NULL AND "recorrencia_id" IS NULL)
);

-- ═══════════════════════════════════════════════════════════
--  INDICES PARCIAIS DE APOIO A CONSULTAS CRITICAS
-- ═══════════════════════════════════════════════════════════

-- Calculo de saldo (RN-01): so linhas que efetivamente afetam saldo.
CREATE INDEX "idx_mov_saldo"
  ON "movimentacoes" ("conta_id", "tipo", "sentido")
  INCLUDE ("valor_pago")
  WHERE "excluido_em" IS NULL
    AND "eh_modelo_recorrencia" = false
    AND "situacao" IN ('PAGA', 'PAGA_PARCIALMENTE');

-- Fila de vencimentos/atrasos (RF-30, RF-69).
CREATE INDEX "idx_mov_pendentes_vencimento"
  ON "movimentacoes" ("data_vencimento", "situacao")
  WHERE "excluido_em" IS NULL
    AND "eh_modelo_recorrencia" = false
    AND "situacao" IN ('PENDENTE', 'ATRASADA');

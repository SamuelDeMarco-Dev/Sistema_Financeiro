-- Issue #46 (M4): centraliza a agregacao de saldo (RN-01, RN-02, RN-03) numa
-- view, para nao repetir a mesma expressao CASE em toda consulta de saldo.
-- Deliberadamente NAO materializada (ADR-005): consistencia imediata vale
-- mais que o ganho de leitura neste volume. Consumida via prisma.$queryRaw
-- tipado, exclusivamente dentro de ContaRepositorio (03-DATABASE.md §8.7).
CREATE OR REPLACE VIEW vw_saldo_conta AS
SELECT
  c.id AS conta_id,
  c.usuario_id,
  c.conta_compartilhada_id,
  c.saldo_inicial + COALESCE(SUM(
    CASE
      WHEN m.tipo = 'RECEITA' THEN m.valor_pago
      WHEN m.tipo = 'DESPESA' THEN -m.valor_pago
      WHEN m.tipo = 'TRANSFERENCIA' AND m.sentido = 'ENTRADA' THEN m.valor_pago
      WHEN m.tipo = 'TRANSFERENCIA' AND m.sentido = 'SAIDA'   THEN -m.valor_pago
    END), 0) AS saldo_atual
FROM contas c
LEFT JOIN movimentacoes m
  ON m.conta_id = c.id
 AND m.excluido_em IS NULL
 AND m.eh_modelo_recorrencia = false
 AND m.situacao IN ('PAGA', 'PAGA_PARCIALMENTE')
WHERE c.excluido_em IS NULL
GROUP BY c.id, c.usuario_id, c.conta_compartilhada_id, c.saldo_inicial;

#!/usr/bin/env bash
set -euo pipefail

ARQUIVO="${1:?Uso: restaurar.sh <arquivo.dump> [banco_destino]}"
BANCO_DESTINO="${2:-pfm_restauracao}"

set -a; source /var/pfm/producao/.env; set +a

echo "▶ Restaurando ${ARQUIVO} em ${BANCO_DESTINO}"

if [ "$BANCO_DESTINO" = "$POSTGRES_BANCO" ]; then
  echo "⚠  DESTINO É O BANCO DE PRODUÇÃO."
  read -rp "   Digite RESTAURAR PRODUCAO para confirmar: " CONFIRMA
  [ "$CONFIRMA" = "RESTAURAR PRODUCAO" ] || { echo "Abortado."; exit 1; }
  ./backup.sh pre-restauracao
fi

CONTAINER_POSTGRES="${NOME_CONTAINER_POSTGRES:-pfm-postgres}"

docker exec -i "$CONTAINER_POSTGRES" psql -U "$POSTGRES_USUARIO" -d postgres \
  -c "DROP DATABASE IF EXISTS ${BANCO_DESTINO};" \
  -c "CREATE DATABASE ${BANCO_DESTINO};"

docker exec -i "$CONTAINER_POSTGRES" pg_restore \
  -U "$POSTGRES_USUARIO" -d "$BANCO_DESTINO" \
  --clean --if-exists --no-owner < "$ARQUIVO"

echo "▶ Verificação: contagem de linhas por tabela"
docker exec -i "$CONTAINER_POSTGRES" psql -U "$POSTGRES_USUARIO" -d "$BANCO_DESTINO" -c "
  SELECT relname AS tabela, n_live_tup AS linhas
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC
  LIMIT 25;"

echo "✔ Restauração concluída em ${BANCO_DESTINO}"

#!/usr/bin/env bash
set -uo pipefail

URL="${URL_SAUDE:-http://127.0.0.1:3333/api/v1/saude/prontidao}"
TENTATIVAS="${TENTATIVAS:-18}"      # 18 × 5s = 90s
INTERVALO="${INTERVALO:-5}"

echo "Verificando prontidão em ${URL} (até $((TENTATIVAS * INTERVALO))s)"

for i in $(seq 1 "$TENTATIVAS"); do
  RESPOSTA=$(curl -fsS --max-time 5 "$URL" 2>/dev/null || echo "")

  if echo "$RESPOSTA" | grep -q '"status":"pronto"'; then
    # Não basta o HTTP 200: toda verificação precisa estar ok
    if echo "$RESPOSTA" | grep -q '"status":"erro"'; then
      echo "  [$i/$TENTATIVAS] responde, mas há verificação com erro:"
      echo "  $RESPOSTA"
    else
      echo "✔ Serviço pronto após $((i * INTERVALO))s"
      echo "$RESPOSTA"
      exit 0
    fi
  else
    echo "  [$i/$TENTATIVAS] ainda não pronto"
  fi

  sleep "$INTERVALO"
done

echo "✖ Serviço não ficou pronto em $((TENTATIVAS * INTERVALO))s"
echo "── Últimas 60 linhas do log da API ──"
docker logs pfm-api --tail 60 2>&1 || true
exit 1

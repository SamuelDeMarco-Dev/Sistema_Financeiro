#!/usr/bin/env bash
set -euo pipefail

cd /var/pfm/producao

TAG_ANTERIOR=$(cat .tag-anterior 2>/dev/null || echo "")

if [ -z "$TAG_ANTERIOR" ]; then
  echo "✖ Nenhuma versão anterior registrada. Rollback automático impossível."
  echo "  Ação manual necessária — consulte o runbook (08-CICD.md §11)."
  echo "$(date -Iseconds) FALHA_SEM_ROLLBACK" >> /var/pfm/releases/historico.log
  exit 1
fi

echo "▶ Revertendo para ${TAG_ANTERIOR}"

sed -i "s/^TAG_IMAGEM=.*/TAG_IMAGEM=${TAG_ANTERIOR}/" .env

docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api

if ./verificar-saude.sh; then
  echo "✔ Rollback concluído: ${TAG_ANTERIOR} operante"
  echo "$(date -Iseconds) ROLLBACK_OK para ${TAG_ANTERIOR}" >> /var/pfm/releases/historico.log
  exit 0
fi

echo "✖ Rollback executado mas a versão anterior também não responde."
echo "  INCIDENTE GRAVE — intervenção manual imediata (runbook §11.3)."
echo "$(date -Iseconds) ROLLBACK_FALHOU" >> /var/pfm/releases/historico.log
exit 1

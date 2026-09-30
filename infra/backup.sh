#!/usr/bin/env bash
set -euo pipefail

ROTULO="${1:-diario}"
DIRETORIO="/var/pfm/backups"
DATA=$(date +%Y%m%d-%H%M)
ARQUIVO="${DIRETORIO}/pfm-${ROTULO}-${DATA}.dump"
TAMANHO_MINIMO=10240                     # 10 KB: abaixo disso, dump inválido

mkdir -p "$DIRETORIO"
set -a; source /var/pfm/producao/.env; set +a

# Sem este trap, um `pg_dump` que falha antes de terminar (banco fora do
# ar, credencial errada) deixa um arquivo vazio/parcial em $ARQUIVO — a
# checagem de tamanho abaixo nunca roda porque `set -e` já abortou o
# script na linha do pg_dump. O trap cobre TODO caminho de saida, nao só
# os dois `exit 1` explicitos (achado rodando de verdade com um banco
# inexistente).
SUCESSO=false
limpar_backup_incompleto() {
  if [ "$SUCESSO" = false ] && [ -f "$ARQUIVO" ]; then
    rm -f "$ARQUIVO"
  fi
}
trap limpar_backup_incompleto EXIT

echo "▶ Backup do banco (${ROTULO})"
docker exec "${NOME_CONTAINER_POSTGRES:-pfm-postgres}" pg_dump \
  -U "$POSTGRES_USUARIO" -d "$POSTGRES_BANCO" \
  --format=custom --compress=9 > "$ARQUIVO"

TAMANHO=$(stat -c%s "$ARQUIVO")
if [ "$TAMANHO" -lt "$TAMANHO_MINIMO" ]; then
  echo "✖ Backup suspeito: ${TAMANHO} bytes"
  exit 1
fi

echo "▶ Verificando integridade"
if ! pg_restore --list "$ARQUIVO" > /dev/null 2>&1; then
  echo "✖ Backup corrompido — descartado"
  exit 1
fi

SUCESSO=true

echo "✔ Banco: ${ARQUIVO} ($(numfmt --to=iec "$TAMANHO"))"

if [ "$ROTULO" = "diario" ]; then
  echo "▶ Backup dos anexos"
  tar -czf "${DIRETORIO}/uploads-${DATA}.tar.gz" -C /var/pfm uploads

  # `|| true`: sob `set -e -o pipefail`, o `ls` de um glob sem nenhum
  # arquivo correspondente (comum na primeira execucao — ainda nao
  # existe nenhum pfm-pre-deploy-*.dump) sai com status != 0 mesmo com
  # `2>/dev/null`, o que aborta o script inteiro ANTES de registrar o
  # backup que acabou de ser feito com sucesso (achado rodando de
  # verdade contra um banco novo, sem historico previo).
  echo "▶ Aplicando retenção (7 diários, 4 semanais)"
  ls -1t "${DIRETORIO}"/pfm-diario-*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f || true
  ls -1t "${DIRETORIO}"/uploads-*.tar.gz  2>/dev/null | tail -n +8 | xargs -r rm -f || true
  ls -1t "${DIRETORIO}"/pfm-pre-deploy-*.dump 2>/dev/null | tail -n +6 | xargs -r rm -f || true
fi

echo "$(date -Iseconds) BACKUP_OK ${ARQUIVO} ${TAMANHO}" >> /var/pfm/releases/historico.log

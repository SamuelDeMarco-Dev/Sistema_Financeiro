#!/usr/bin/env bash
# Instalar em /etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh
# no servidor. Sem isto, o certificado renova mas o Nginx continua
# servindo o antigo até o próximo reload — e o problema só aparece
# quando o certificado antigo expira (08-CICD.md §4.3).
set -euo pipefail
systemctl reload nginx

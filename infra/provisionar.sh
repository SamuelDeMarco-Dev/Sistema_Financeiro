#!/usr/bin/env bash
set -euo pipefail

USUARIO_DEPLOY="deploy"

echo "▶ Atualizando o sistema"
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git ufw fail2ban unattended-upgrades \
                       ca-certificates gnupg postgresql-client

echo "▶ Timezone e NTP"
timedatectl set-timezone America/Sao_Paulo
timedatectl set-ntp true

echo "▶ Usuário de deploy"
if ! id "$USUARIO_DEPLOY" &>/dev/null; then
  adduser --disabled-password --gecos "" "$USUARIO_DEPLOY"
fi

echo "▶ Docker"
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
usermod -aG docker "$USUARIO_DEPLOY"

echo "▶ Endurecimento do SSH"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'            /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/'  /etc/ssh/sshd_config
systemctl restart ssh

echo "▶ Firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "▶ fail2ban"
systemctl enable --now fail2ban

echo "▶ Estrutura de diretórios"
mkdir -p /var/pfm/{uploads,backups,releases,exportacoes}
mkdir -p /var/pfm/{producao,staging}
mkdir -p /var/www/{pfm,pfm-staging,certbot}
chown -R "$USUARIO_DEPLOY:$USUARIO_DEPLOY" /var/pfm /var/www/pfm /var/www/pfm-staging
chmod 750 /var/pfm/uploads /var/pfm/backups

# /var/pfm/uploads e bind mount de dentro do container (docker-compose.prod.yml),
# onde o processo roda como o usuario `node` da imagem node:22-alpine — uid/gid
# 1000 fixo, nao o do usuario `deploy` do host. Sem isto, a API sobe mas
# /api/v1/saude/prontidao reporta "armazenamento: EACCES" (achado no ensaio
# de rollback da issue #61).
chown 1000:1000 /var/pfm/uploads

echo "▶ Swap de 2 GB"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "▶ Nginx"
apt-get install -y -qq nginx
systemctl enable --now nginx

echo "✔ Provisionamento concluído"

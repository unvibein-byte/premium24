#!/usr/bin/env bash
set -euo pipefail

# Usage: sudo bash deploy/setup.sh yourdomain.com api.yourdomain.com

APP_DOMAIN="${1:-app.example.com}"
API_DOMAIN="${2:-api.example.com}"

echo "[+] Updating system packages"
apt update && apt -y upgrade

echo "[+] Installing Nginx, Node.js 20, PM2, Certbot"
apt -y install nginx curl ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt -y install nodejs
npm i -g pm2
apt -y install certbot python3-certbot-nginx

echo "[+] Configuring firewall"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable

echo "[+] Creating app directories"
mkdir -p /srv/premium24
chown -R $SUDO_USER:$SUDO_USER /srv/premium24 || true

echo "[+] Creating Nginx server blocks"
cat >/etc/nginx/sites-available/premium24-api <<EOF
server {
  listen 80;
  server_name ${API_DOMAIN};

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF

cat >/etc/nginx/sites-available/premium24-app <<EOF
server {
  listen 80;
  server_name ${APP_DOMAIN};
  root /srv/premium24/src/dist;
  index index.html;
  location / {
    try_files \$uri /index.html;
  }
}
EOF

ln -sf /etc/nginx/sites-available/premium24-api /etc/nginx/sites-enabled/premium24-api
ln -sf /etc/nginx/sites-available/premium24-app /etc/nginx/sites-enabled/premium24-app
nginx -t && systemctl reload nginx

echo "[+] Obtaining SSL certificates"
certbot --nginx -d "${APP_DOMAIN}" -d "${API_DOMAIN}" --redirect --agree-tos -m admin@${APP_DOMAIN} --no-eff-email || true

echo "[+] Setup complete. Next: copy project code to /srv/premium24 and run deploy.sh"


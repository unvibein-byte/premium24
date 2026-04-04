#!/usr/bin/env bash
set -euo pipefail

# Usage: bash deploy/deploy.sh
# Assumes project is already present at /srv/premium24 on the VPS.

APP_DIR="/srv/premium24"
API_DIR="${APP_DIR}/backend"
FRONT_DIR="${APP_DIR}/src"

echo "[+] Installing backend dependencies (if needed)"
pushd "$API_DIR" >/dev/null
npm ci || npm i
popd >/dev/null

echo "[+] Installing frontend dependencies (if needed)"
pushd "$FRONT_DIR" >/dev/null
npm ci || npm i
echo "[+] Building frontend"
npm run build
popd >/dev/null

echo "[+] Starting backend with PM2"
pm2 start "${API_DIR}/index.js" --name premium24-api || pm2 restart premium24-api
pm2 save

echo "[+] Reloading Nginx"
nginx -t && systemctl reload nginx

echo "[+] Deploy complete. App: /srv/premium24/src/dist, API via PM2: premium24-api"


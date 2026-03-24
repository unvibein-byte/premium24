# Premium24 Auth + Database Setup (Hostinger VPS)

## 1) Install PostgreSQL on VPS

Ubuntu/Debian example:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

## 2) Create DB and user

```bash
sudo -u postgres psql
CREATE DATABASE premium24;
CREATE USER premium24_user WITH ENCRYPTED PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;
\q
```

## 3) Run schema

Inside the backend folder on VPS:

```bash
psql "postgresql://premium24_user:strong_password_here@127.0.0.1:5432/premium24" -f schema.sql
```

## 4) Configure backend env

Copy `env.example` to `.env` and fill real values:

```bash
cp env.example .env
```

Important variables:
- `DATABASE_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CORS_ORIGIN` (set your web domain, e.g. `https://yourdomain.com`)

## 5) Start backend with PM2

```bash
npm install
npm run start
```

For production process manager:

```bash
npm install -g pm2
pm2 start index.js --name premium24-backend
pm2 save
pm2 startup
```

## 6) Android + Web usage

Use the same backend base URL in web and Android:

- `POST /api/auth/register` with `{ username, email, password }`
- `POST /api/auth/login` with `{ identifier, password }`
- `POST /api/auth/refresh` with `{ refreshToken }`
- `POST /api/auth/logout` with `{ refreshToken }`
- `GET /api/auth/me` with header `Authorization: Bearer <accessToken>`

Store tokens securely:
- Web: keep access token in memory if possible, refresh token in secure cookie or protected storage.
- Android: use encrypted preferences/keystore.

---

## 7) One-shot commands template

Use placeholders and replace with your real server values.

### A) Run on VPS (after SSH login)

```bash
apt update
apt install -y postgresql postgresql-contrib nodejs npm nginx certbot python3-certbot-nginx ufw
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql <<'SQL'
CREATE DATABASE premium24;
CREATE USER premium24_user WITH ENCRYPTED PASSWORD 'REPLACE_WITH_STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;
SQL
```

### B) Upload backend from your local PC (run locally in Windows PowerShell)

```powershell
scp -r "D:\android development\premium24\backend" root@YOUR_VPS_IP:/opt/premium24-backend
```

### C) Back on VPS, configure and run backend

```bash
cd /opt/premium24-backend
npm install
cp env.example .env
```

`DATABASE_URL` needs URL-encoded password:
- Raw password: `YOUR_DB_PASSWORD`
- URL-encoded example: `YOUR_DB_PASSWORD_URL_ENCODED`

Create `.env`:

```bash
cat > /opt/premium24-backend/.env <<'ENV'
PORT=4000
CORS_ORIGIN=*
ACCESS_TOKEN_SECRET=REPLACE_ME_WITH_RANDOM_SECRET_1
REFRESH_TOKEN_SECRET=REPLACE_ME_WITH_RANDOM_SECRET_2
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
DATABASE_URL=postgresql://premium24_user:YOUR_DB_PASSWORD_URL_ENCODED@127.0.0.1:5432/premium24
DB_SSL=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SETUP_API_KEY=REPLACE_ME_WITH_RANDOM_SETUP_KEY
ENV
```

Generate and paste secure secrets:

```bash
openssl rand -base64 48
openssl rand -base64 48
nano /opt/premium24-backend/.env
```

Run schema and start with PM2:

```bash
cd /opt/premium24-backend
npm install -g pm2
pm2 start index.js --name premium24-backend
pm2 save
pm2 startup
```

Allow direct API testing on port 4000:

```bash
ufw allow 4000/tcp
ufw status
curl http://127.0.0.1:4000/api/health
curl -X POST http://127.0.0.1:4000/api/setup/init -H "x-setup-key: REPLACE_ME_WITH_RANDOM_SETUP_KEY"
```

### D) Optional: Nginx domain setup (recommended)

Create a reverse-proxy config (replace `api.yourdomain.com`):

```bash
cat > /etc/nginx/sites-available/premium24-backend <<'NGINX'
server {
  listen 80;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
NGINX

ln -sf /etc/nginx/sites-available/premium24-backend /etc/nginx/sites-enabled/premium24-backend
nginx -t
systemctl reload nginx
```

Enable HTTPS:

```bash
certbot --nginx -d api.yourdomain.com
```

After HTTPS, update backend `.env`:
- `CORS_ORIGIN=https://yourdomain.com` (your web app domain)

Restart backend:

```bash
pm2 restart premium24-backend
```

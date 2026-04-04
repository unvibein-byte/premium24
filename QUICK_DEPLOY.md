# Quick Deployment Steps for Premium24

## Your VPS Details
- **IP:** 72.60.99.29
- **Domains:** typingwork24.in, typingwork24.com
- **OS:** Ubuntu 24.04

---

## Option A: Automated Deployment (Recommended)

### Step 1: SSH into your VPS
```powershell
# From your Windows machine, use PowerShell or Git Bash
ssh root@72.60.99.29
```

### Step 2: Download and run deployment script
```bash
cd /home
wget https://raw.githubusercontent.com/unvibein-byte/premium24/main/deploy.sh
chmod +x deploy.sh
bash deploy.sh
```

**Or manually from your local machine:**
```powershell
# Copy the deploy script to VPS
scp "d:\android development\premium24\deploy.sh" root@72.60.99.29:/home/
ssh root@72.60.99.29 "chmod +x /home/deploy.sh && bash /home/deploy.sh"
```

### Step 3: Copy your code to VPS
```powershell
# Option A: Copy directly via SCP
scp -r "d:\android development\premium24\backend" root@72.60.99.29:/srv/premium24/
scp -r "d:\android development\premium24\src" root@72.60.99.29:/srv/premium24/
scp "d:\android development\premium24\package.json" root@72.60.99.29:/srv/premium24/
scp "d:\android development\premium24\vite.config.js" root@72.60.99.29:/srv/premium24/

# Option B: Clone from GitHub (if you push your code there first)
ssh root@72.60.99.29
cd /srv/premium24
git clone https://github.com/unvibein-byte/premium24.git .
```

### Step 4: Update backend configuration
```bash
ssh root@72.60.99.29
nano /srv/premium24/backend/.env
```

**Update these fields with your real values:**
```
FIREBASE_PROJECT_ID=typingwork24
FIREBASE_CLIENT_EMAIL=your_firebase_email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your_firebase_private_key
GOOGLE_CLIENT_SECRET=your_google_client_secret
WATCHPAY_API_KEY=your_real_payment_key_from_watchpay
ENABLE_MOCK_PAYMENTS=false
```

### Step 5: Verify deployment
```bash
# Check if backend is running
pm2 status

# Check logs
pm2 logs premium24-api

# Visit your site
# https://typingwork24.in
```

---

## Option B: Manual Step-by-Step Deployment

### 1. SSH into VPS
```bash
ssh root@72.60.99.29
```

### 2. System Setup
```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database
DB_PASSWORD=$(openssl rand -base64 32)
echo "Save this password: $DB_PASSWORD"

sudo -u postgres psql << EOF
CREATE DATABASE premium24;
CREATE USER premium24_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;
EOF

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3. Deploy Code
```bash
mkdir -p /srv/premium24
cd /srv/premium24

# Copy your code here (use SCP from your local machine)
# scp -r "D:\android development\premium24\*" root@72.60.99.29:/srv/premium24/
```

### 4. Setup Backend
```bash
cd /srv/premium24/backend
npm install --production

cp env.example .env
nano .env

# Update .env with:
# - DATABASE_URL (use the password from step 2)
# - CORS_ORIGIN=https://typingwork24.in,https://typingwork24.com
# - WATCHPAY_API_KEY
# - Other credentials
```

### 5. Initialize Database
```bash
psql -U premium24_user -d premium24 -h 127.0.0.1 -f schema.sql
```

### 6. Start Backend
```bash
pm2 start index.js --name "premium24-api"
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

### 7. Build Frontend
```bash
cd /srv/premium24
npm install
npm run build
```

### 8. Configure Nginx
```bash
# Create config (copy from DEPLOYMENT_GUIDE.md)
sudo nano /etc/nginx/sites-available/premium24

# Enable it
sudo ln -s /etc/nginx/sites-available/premium24 /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Setup SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d typingwork24.in -d typingwork24.com
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 10. Verify
```bash
pm2 status
pm2 logs premium24-api
```

Visit: https://typingwork24.in ✅

---

## Getting WatchPay Payment Key

Once deployed, you need to get your real Payment Key:

1. **Log into WatchPay merchant dashboard**
2. **Contact your business manager** with:
   - Merchant ID: 100528114
   - Server IP: 72.60.99.29
3. **Request:** "Please bind my server IP and generate Payment Key for API"
4. **They will send you:** Your unique Payment Key
5. **Update backend .env:**
   ```bash
   ssh root@72.60.99.29
   nano /srv/premium24/backend/.env
   ```
   Change:
   ```
   WATCHPAY_API_KEY=YOUR_REAL_KEY_HERE
   ENABLE_MOCK_PAYMENTS=false
   ```
6. **Restart backend:**
   ```bash
   pm2 restart premium24-api
   ```

---

## Useful Commands After Deployment

```bash
# View logs
pm2 logs premium24-api

# Restart backend
pm2 restart premium24-api

# Stop backend
pm2 stop premium24-api

# Start backend
pm2 start premium24-api

# Check status
pm2 status

# View all running apps
pm2 list

# Update frontend (after code changes)
cd /srv/premium24
git pull                # if using Git
npm run build
sudo systemctl reload nginx
```

---

## Troubleshooting

### Backend won't start?
```bash
pm2 logs premium24-api
```

### Database connection error?
```bash
psql -U premium24_user -d premium24 -h 127.0.0.1 -c "SELECT 1;"
```

### SSL certificate issues?
```bash
sudo certbot renew --dry-run
sudo certbot certificates
```

### Nginx not working?
```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx -n 50
```

---

## Support
Check logs anytime:
```bash
pm2 logs
pm2 logs premium24-api
pm2 logs --tail=100
```

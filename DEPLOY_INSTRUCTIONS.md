# 🚀 Premium24 - One-Click Deployment Guide

## Your VPS Information
- **IP Address:** 72.60.99.29
- **Primary Domain:** typingwork24.in
- **Secondary Domain:** typingwork24.com
- **OS:** Ubuntu 24.04

---

## 📋 Prerequisites (Before Deployment)

### 1. Ensure SSH Access Works
From your Windows machine, test SSH connection:
```powershell
ssh root@72.60.99.29
```
✅ If it works, you're good!

### 2. Ensure Node.js is Installed Locally
```powershell
node --version
npm --version
```
✅ Should show: v18+ and npm v8+

### 3. Ensure SSH/SCP Commands Available
```powershell
# Try this command
ssh -V
scp -V
```
✅ If these fail, install **Git Bash for Windows** (includes OpenSSH tools)
- Download: https://git-scm.com/download/win
- Install normally
- Restart PowerShell after installation

---

## 🎯 One-Click Deployment

### Option A: Using Batch File (Easiest)
1. Navigate to your project folder in Windows Explorer
2. Double-click **`deploy.bat`**
3. Follow the prompts
4. Done! ✅

### Option B: Using PowerShell (Manual)
1. Open PowerShell
2. Navigate to your project:
   ```powershell
   cd "d:\android development\premium24"
   ```
3. Run deployment:
   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy-auto.ps1
   ```
4. Press Enter to start
5. Wait for deployment to complete ✅

---

## 📊 What the Script Does

The automated deployment script:

1. ✅ **Builds your frontend** (Vite)
   - Installs npm dependencies
   - Compiles to optimized dist folder

2. ✅ **Uploads code to VPS** via SCP
   - Backend files
   - Frontend dist folder
   - Configuration files

3. ✅ **Installs backend dependencies**
   - npm install --production

4. ✅ **Restarts services**
   - Stops old backend process
   - Starts new backend with PM2
   - Reloads Nginx

5. ✅ **Verifies deployment**
   - Shows PM2 status
   - Displays recent logs

---

## ⚙️ Configuration After Deployment

### Step 1: SSH into VPS
```powershell
ssh root@72.60.99.29
```

### Step 2: Edit Backend Configuration
```bash
nano /srv/premium24/backend/.env
```

### Step 3: Update These Fields
Press `Ctrl+X` and `Y` to save when done.

**Required:**
```
FIREBASE_PROJECT_ID=typingwork24
FIREBASE_CLIENT_EMAIL=your_firebase_email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your_firebase_private_key_with_escaped_newlines
GOOGLE_CLIENT_SECRET=your_google_secret
```

**For WatchPay Payments (get from support@watchglb.com):**
```
WATCHPAY_API_KEY=YOUR_KEY_FROM_WATCHPAY
ENABLE_MOCK_PAYMENTS=false
```

### Step 4: Restart Backend
```bash
pm2 restart premium24-api
```

---

## ✅ Verify Deployment

### Check if Backend is Running
```bash
# From any terminal
ssh root@72.60.99.29 "pm2 status"
```
Should show: `premium24-api online`

### Check Recent Logs
```bash
ssh root@72.60.99.29 "pm2 logs premium24-api --lines=50 --nostream"
```

### Test Your Site
- Open in browser: **https://typingwork24.in**
- Should show your Premium24 app ✅

### Test Backend API
```powershell
$response = Invoke-WebRequest -Uri "https://typingwork24.in/api/payment/create-order" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"amount":499,"currency":"INR","country":"india","payType":"101"}' `
  -UseBasicParsing

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

---

## 🔄 Deployment Workflow

```
Your Local Machine
       ↓
   Build Frontend (npm run build)
       ↓
   Upload to VPS (via SCP)
       ↓
   Install Dependencies
       ↓
   Restart Services (PM2 + Nginx)
       ↓
  Your Site at
  https://typingwork24.in ✅
```

---

## 📝 Useful Commands After Deployment

```bash
# View status of backend
pm2 status

# View logs in real-time
pm2 logs premium24-api

# Restart backend
pm2 restart premium24-api

# Stop backend
pm2 stop premium24-api

# Start backend
pm2 start premium24-api

# View all running apps
pm2 list

# Delete a process
pm2 delete premium24-api

# Reapply PM2 startup hook
sudo pm2 startup systemd -u root --hp /root
pm2 save
```

---

## 🚨 Troubleshooting

### Deployment Fails at "Test Prerequisites"
**Problem:** Node.js or npm not installed
**Solution:**
```powershell
# Install Node.js from: https://nodejs.org
# Then restart PowerShell and try again
```

### Deployment Fails at "Upload Code"
**Problem:** SSH/SCP not working
**Solution:**
```powershell
# Verify SSH works
ssh root@72.60.99.29 "echo 'SSH works!'"

# If it fails, install Git Bash with OpenSSH
# https://git-scm.com/download/win
```

### Backend Fails to Start
**Solution:**
```bash
# SSH and check logs
ssh root@72.60.99.29
pm2 logs premium24-api

# Check database connection
psql -U premium24_user -d premium24 -h 127.0.0.1 -c "SELECT 1;"

# Check if port 4000 is available
sudo lsof -i :4000
```

### Site Shows "502 Bad Gateway"
**Problem:** Nginx can't connect to backend
**Solution:**
```bash
# Check if backend is running
pm2 status

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Need to See What's Deployed
```bash
# SSH and check
ssh root@72.60.99.29
ls -la /srv/premium24/
ls -la /srv/premium24/backend/
ls -la /srv/premium24/dist/
```

---

## 🔐 Security Notes

1. **Change SSH Password:** After first login
   ```bash
   passwd
   ```

2. **Setup Firewall:**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Keep Secrets Safe:**
   - Never commit `backend/.env` to Git
   - Use strong random passwords
   - Rotate credentials periodically

---

## 📞 Getting Help

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `ssh: command not found` | OpenSSH not installed | Install Git Bash for Windows |
| `Connection refused` | VPS not reachable | Check VPS IP, firewall |
| `npm: command not found` | Node.js not installed | Install Node.js |
| `Backend crashes on start` | Bad .env values | Check .env file on VPS |
| `502 Bad Gateway` | Backend not running | Run `pm2 restart premium24-api` |

---

## 🎉 What's Next After Deployment?

1. **Get WatchPay Payment Key**
   - Contact: support@watchglb.com
   - Tell them: Merchant ID `100528114`, Server IP `72.60.99.29`
   - They'll send your Payment Key
   - Update `.env` and restart: `pm2 restart premium24-api`

2. **Setup Custom Domain** (if different from typingwork24.in)
   - Update DNS to point to `72.60.99.29`
   - Update Nginx config
   - Get new SSL certificate

3. **Monitor Your Site**
   ```bash
   ssh root@72.60.99.29 "pm2 monit"
   ```

4. **Setup Automated Backups**
   - Database: `pg_dump`
   - Files: `rsync` to backup location

---

## 📚 Additional Resources

- **Nginx Docs:** https://nginx.org/en/docs/
- **PM2 Docs:** https://pm2.keymetrics.io/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Let's Encrypt:** https://letsencrypt.org/

---

## ✨ You're All Set!

Your Premium24 application is now live at:
- 🌐 **https://typingwork24.in**
- 🌐 **https://typingwork24.com**

Questions? Check the logs or contact your VPS provider.

**Happy deploying! 🚀**

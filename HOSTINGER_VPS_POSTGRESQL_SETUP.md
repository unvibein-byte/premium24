# Hostinger VPS PostgreSQL Setup Guide

## VPS Details
- **IP**: 72.60.99.29
- **Hostname**: srv992795.hstgr.cloud
- **OS**: Ubuntu 24.04
- **Domain**: typingwork24.com

## Step 1: Connect to Your VPS via SSH

```bash
# From your terminal/PowerShell
ssh root@72.60.99.29
# or
ssh root@srv992795.hstgr.cloud
```

## Step 2: Update System Packages

```bash
apt update
apt upgrade -y
```

## Step 3: Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
```

## Step 4: Start PostgreSQL Service

```bash
systemctl start postgresql
systemctl enable postgresql  # Auto-start on reboot
```

## Step 5: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL shell, run these commands:
CREATE DATABASE premium24;
CREATE USER premium24_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
ALTER ROLE premium24_user SET client_encoding TO 'utf8';
ALTER ROLE premium24_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE premium24_user SET default_transaction_deferrable TO on;
ALTER ROLE premium24_user SET default_tzinfo_is_local TO off;
GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;

# Exit PostgreSQL
\q
```

## Step 6: Configure PostgreSQL for Remote Access

Edit PostgreSQL configuration file:

```bash
nano /etc/postgresql/16/main/postgresql.conf
```

Find and update/uncomment this line:
```
listen_addresses = '*'
```

Save and exit (Ctrl+X, Y, Enter).

Edit PostgreSQL HBA configuration:

```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

Add this line at the end (before the final lines):
```
host    all             all             0.0.0.0/0               md5
```

This allows connections from any IP. For production, replace `0.0.0.0/0` with specific IPs.

Save and exit.

## Step 7: Restart PostgreSQL

```bash
systemctl restart postgresql
```

## Step 8: Test Connection

From your local machine, test the connection:

```bash
# Using psql (if installed locally)
psql -h 72.60.99.29 -U premium24_user -d premium24

# Or from your backend
# Will be tested after updating .env
```

## Step 9: Update Backend .env File

Create or update `.env` in `backend/` directory:

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,https://typingwork24.com,https://www.typingwork24.com,capacitor://localhost,http://localhost

ACCESS_TOKEN_SECRET=your_long_random_secret_here
REFRESH_TOKEN_SECRET=your_different_long_random_secret_here
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30

# Hostinger VPS Database
DATABASE_URL=postgresql://premium24_user:your_secure_password_here@72.60.99.29:5432/premium24
DB_SSL=false

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your_firebase_private_key

SETUP_API_KEY=your_long_random_setup_key

ENABLE_MOCK_PAYMENTS=true
WATCHPAY_BASE_URL=https://merchant.watchglb.com
WATCHPAY_API_KEY=your_watchpay_api_key_when_ready
```

## Step 10: Create Database Tables

Run your schema file on the VPS:

```bash
# From VPS
psql -U premium24_user -d premium24 -h localhost < /path/to/schema.sql

# Or from local machine
psql -h 72.60.99.29 -U premium24_user -d premium24 -f backend/schema.sql
```

## Verification

Check tables were created:

```bash
psql -h 72.60.99.29 -U premium24_user -d premium24

# Inside PostgreSQL:
\dt  # List all tables
\l   # List all databases
```

## Common Commands

```bash
# Connect to database from anywhere
psql -h 72.60.99.29 -U premium24_user -d premium24

# For local connections (from VPS terminal)
psql -U premium24_user -d premium24

# Check PostgreSQL status
systemctl status postgresql

# View logs
tail -f /var/log/postgresql/postgresql-16-main.log
```

## Troubleshooting

### Connection Refused
- Check PostgreSQL is running: `systemctl status postgresql`
- Check firewall allows port 5432: `ufw status`
- If needed, allow PostgreSQL: `ufw allow 5432/tcp`

### Authentication Failed
- Verify username/password are correct
- Check pg_hba.conf has proper authentication method
- Restart PostgreSQL after config changes: `systemctl restart postgresql`

### Database Doesn't Exist
- Run Step 5 again to create database and user
- Verify with `\l` in PostgreSQL shell

## Next Steps

1. ✅ Complete steps 1-9 above
2. ✅ Update backend/.env with real credentials
3. ✅ Run `npm install` in backend/
4. ✅ Start backend: `npm run dev`
5. ✅ Test API endpoints with Postman or curl

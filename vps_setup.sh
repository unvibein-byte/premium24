#!/bin/bash

echo "=== Premium24 Backend Setup for Hostinger VPS ==="
echo "VPS IP: 72.60.99.29"
echo "Domains: typingwork24.com, typingwork24.in"
echo ""

# Update system
echo "Updating system..."
apt update && apt upgrade -y

# Install required packages
echo "Installing PostgreSQL, Node.js, Nginx..."
apt install -y postgresql postgresql-contrib nodejs npm nginx certbot python3-certbot-nginx ufw curl

# Start PostgreSQL
echo "Starting PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Create database and user
echo "Creating database and user..."
DB_PASSWORD="Premium24_DB_2024_Secure!"
sudo -u postgres psql << EOF
CREATE DATABASE premium24;
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'premium24_user') THEN
      CREATE USER premium24_user WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;
GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;
ALTER USER premium24_user CREATEDB;
EOF

echo "Database created with password: $DB_PASSWORD"

# Create backend directory
echo "Creating backend directory..."
mkdir -p /opt/premium24-backend
cd /opt/premium24-backend

# Create environment file
echo "Creating environment configuration..."
cat > .env << 'ENV'
PORT=4000
CORS_ORIGIN=https://typingwork24.com,https://www.typingwork24.com,https://typingwork24.in,https://www.typingwork24.in,capacitor://localhost,http://localhost
ACCESS_TOKEN_SECRET=REPLACE_WITH_RANDOM_SECRET_1
REFRESH_TOKEN_SECRET=REPLACE_WITH_RANDOM_SECRET_2
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
DATABASE_URL=postgresql://premium24_user:Premium24_DB_2024_Secure!@127.0.0.1:5432/premium24
DB_SSL=false
SETUP_API_KEY=premium24_setup_key_2024
ENV

# Generate secure secrets
echo "Generating secure secrets..."
SECRET1=$(openssl rand -base64 48)
SECRET2=$(openssl rand -base64 48)

# Update .env with real secrets
sed -i "s/REPLACE_WITH_RANDOM_SECRET_1/$SECRET1/" .env
sed -i "s/REPLACE_WITH_RANDOM_SECRET_2/$SECRET2/" .env

echo "Secrets generated and saved to .env"

echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Upload your backend code to /opt/premium24-backend/"
echo "2. Run: npm install && npm install -g pm2"
echo "3. Run database schema: psql 'postgresql://premium24_user:Premium24_DB_2024_Secure!@127.0.0.1:5432/premium24' -f schema.sql"
echo "4. Start backend: pm2 start index.js --name premium24-backend && pm2 save && pm2 startup"
echo "5. Configure Nginx reverse proxy (see instructions below)"
echo "6. Enable HTTPS with certbot"
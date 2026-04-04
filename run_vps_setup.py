import paramiko
import time

host = "72.60.99.29"
port = 22
username = "root"
password = "@@@TypingWork24@@@"

print(f"Connecting to {host}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, port, username, password, timeout=10)
    print("Connected successfully!")
    
    # Run the setup script commands
    commands = [
        "apt update && apt install -y postgresql postgresql-contrib nodejs npm nginx certbot python3-certbot-nginx ufw curl",
        "systemctl enable postgresql && systemctl start postgresql",
        """sudo -u postgres psql -c "CREATE DATABASE premium24;" || true""",
        """sudo -u postgres psql -c "DO \\$\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'premium24_user') THEN CREATE USER premium24_user WITH PASSWORD 'Premium24_DB_2024_Secure!'; END IF; END \\$\\$;" """,
        """sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;" """,
        """sudo -u postgres psql -c "ALTER USER premium24_user CREATEDB;" """,
        
        "cd /opt/premium24-backend && npm install",
        
        # Setting up .env for backend if it doesn't exist
        """
        if [ ! -f /opt/premium24-backend/.env ]; then
            cat > /opt/premium24-backend/.env << 'ENV'
PORT=4000
CORS_ORIGIN=https://typingwork24.com,https://www.typingwork24.com,https://typingwork24.in,https://www.typingwork24.in,capacitor://localhost,http://localhost
ACCESS_TOKEN_SECRET=$(openssl rand -base64 48)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 48)
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
DATABASE_URL=postgresql://premium24_user:Premium24_DB_2024_Secure!@127.0.0.1:5432/premium24
DB_SSL=false
SETUP_API_KEY=premium24_setup_key_2024
ENV
        fi
        """,
        
        # We need to run the schema
        "cd /opt/premium24-backend && PGPASSWORD='Premium24_DB_2024_Secure!' psql -U premium24_user -h 127.0.0.1 -d premium24 -f schema.sql",
        
        # Start backend using PM2
        "npm install -g pm2",
        "cd /opt/premium24-backend && pm2 delete premium24-backend || true",
        "cd /opt/premium24-backend && pm2 start index.js --name premium24-backend",
        "pm2 save",
        "pm2 startup systemd -u root --hp /root || true",
        
        "ufw allow 4000/tcp || true",
        "curl http://127.0.0.1:4000/api/health"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd[:50]}...")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        
        if out:
            print(f"OUT: {out}")
        if err:
            print(f"ERR: {err}")
        print(f"Exit status: {exit_status}\n")
        
finally:
    client.close()
    print("Disconnected.")

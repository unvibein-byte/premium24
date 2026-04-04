import paramiko
import time
import sys

# Force utf-8 encoding for standard output to avoid charmap errors
sys.stdout.reconfigure(encoding='utf-8')

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
    
    commands = [
        # Set password explicitly again just to be sure
        """sudo -u postgres psql -c "ALTER USER premium24_user WITH PASSWORD 'Premium24_DB_2024_Secure!';" """,
        
        # We need to run the schema
        "cd /opt/premium24-backend && sudo -u postgres psql -d premium24 -f schema.sql",
        
        # Start backend using PM2
        "cd /opt/premium24-backend && pm2 restart premium24-backend || pm2 start index.js --name premium24-backend",
        "pm2 save",
        "pm2 startup systemd -u root --hp /root || true",
        
        "ufw allow 4000/tcp || true",
        "curl -s http://127.0.0.1:4000/api/health"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd[:50]}...")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        if out:
            print(f"OUT: {out}")
        if err:
            print(f"ERR: {err}")
        print(f"Exit status: {exit_status}\n")
        
finally:
    client.close()
    print("Disconnected.")

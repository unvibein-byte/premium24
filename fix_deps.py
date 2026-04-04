import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

host = "72.60.99.29"
port = 22
username = "root"
password = "@@@TypingWork24@@@"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, port, username, password, timeout=10)
    
    commands = [
        "cd /opt/premium24-backend && npm install firebase-admin dotenv express jsonwebtoken pg bcrypt cors express-validator node-fetch",
        "cd /opt/premium24-backend && pm2 restart premium24-backend",
        "sleep 2",
        "curl -s http://127.0.0.1:4000/api/health"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd[:50]}...")
        stdin, stdout, stderr = client.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        print(f"OUT: {out}")
        print(f"Exit status: {exit_status}\n")

finally:
    client.close()

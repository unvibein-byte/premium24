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
        "wget -qO pgweb.zip https://github.com/sosedoff/pgweb/releases/download/v0.14.2/pgweb_linux_amd64.zip",
        "apt-get install unzip -y",
        "unzip -o pgweb.zip",
        "mv pgweb_linux_amd64 /usr/local/bin/pgweb",
        "chmod +x /usr/local/bin/pgweb",
        "rm pgweb.zip",
        "ufw allow 8081/tcp",
        "pm2 delete pgweb || true",
        "pm2 start pgweb --name pgweb -- --bind=0.0.0.0 --listen=8081 --url=postgres://premium24_user:Premium24_DB_2024_Secure!@127.0.0.1:5432/premium24?sslmode=disable",
        "pm2 save"
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

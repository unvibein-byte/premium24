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
    
    # 1. Update CORS_ORIGIN on VPS to allow localhost dev
    cmd = """
sed -i 's/CORS_ORIGIN=.*/CORS_ORIGIN=http:\/\/localhost:5173,http:\/\/127.0.0.1:5173,capacitor:\/\/localhost,http:\/\/localhost,https:\/\/typingwork24.in,https:\/\/www.typingwork24.in/' /opt/premium24-backend/.env
pm2 restart premium24-backend
"""
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
    
finally:
    client.close()

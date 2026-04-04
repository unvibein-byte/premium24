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
    
    # 1. Check PM2 logs for the backend
    cmd = "pm2 logs premium24-backend --lines 50 --raw"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("--- VPS Backend Logs ---")
    print(stdout.read().decode('utf-8'))
    
finally:
    client.close()

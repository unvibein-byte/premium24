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
    
    # 1. Use pm2 logs with a larger buffer and grep for errors
    cmd = "pm2 logs premium24-backend --lines 100 --raw --err"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("--- VPS Backend ERROR Logs ---")
    print(stdout.read().decode('utf-8'))
    
    # 2. Also check standard logs
    cmd = "pm2 logs premium24-backend --lines 100 --raw --out"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("--- VPS Backend OUTPUT Logs ---")
    print(stdout.read().decode('utf-8'))
    
finally:
    client.close()

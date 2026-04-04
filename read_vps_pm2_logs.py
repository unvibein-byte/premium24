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
    
    # Check the actual log files from PM2 path
    # Usually in /root/.pm2/logs/
    cmd = "tail -n 50 /root/.pm2/logs/premium24-backend-out.log"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("--- VPS Backend OUTPUT Log File ---")
    print(stdout.read().decode('utf-8'))
    
    cmd = "tail -n 50 /root/.pm2/logs/premium24-backend-error.log"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("--- VPS Backend ERROR Log File ---")
    print(stdout.read().decode('utf-8'))
    
finally:
    client.close()

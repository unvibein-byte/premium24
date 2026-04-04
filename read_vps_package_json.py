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
    
    # Read package.json on VPS
    cmd = "cat /opt/premium24-backend/package.json"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("--- VPS package.json ---")
    print(stdout.read().decode('utf-8'))
    
finally:
    client.close()

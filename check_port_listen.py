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
    
    # Check if anything is listening on port 4000
    cmd = "netstat -tuln | grep :4000"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("--- VPS Port 4000 Listen Status ---")
    print(stdout.read().decode('utf-8'))
    
    # Check PM2 status again
    cmd = "pm2 status"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("--- PM2 Status ---")
    print(stdout.read().decode('utf-8'))
    
finally:
    client.close()

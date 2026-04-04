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
    client.connect(host, port, username, password, timeout=30)
    
    # 1. Install missing dependencies on the VPS
    commands = [
        "cd /opt/premium24-backend && npm install",
        "pm2 restart premium24-backend"
    ]
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        print(stdout.read().decode('utf-8'))
        print(stderr.read().decode('utf-8'))
        
    # 2. Verify port status
    stdin, stdout, stderr = client.exec_command("netstat -tuln | grep :4000")
    print("--- Port 4000 Status ---")
    print(stdout.read().decode('utf-8'))

finally:
    client.close()

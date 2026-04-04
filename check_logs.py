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
    stdin, stdout, stderr = client.exec_command("pm2 logs premium24-backend --lines 20 --nostream")
    print(stdout.read().decode('utf-8', errors='replace'))
    print(stderr.read().decode('utf-8', errors='replace'))
finally:
    client.close()

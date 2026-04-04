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
    
    # 1. Open Postgres port in ufw
    client.exec_command("ufw allow 5432/tcp")
    
    # 2. Find postgresql config files and update them
    script = """
PG_CONF=$(find /etc/postgresql -name postgresql.conf | head -n 1)
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -n 1)

if ! grep -q "listen_addresses = '*'" "$PG_CONF"; then
    echo "listen_addresses = '*'" >> "$PG_CONF"
fi

if ! grep -q "0.0.0.0/0" "$PG_HBA"; then
    echo "host all all 0.0.0.0/0 md5" >> "$PG_HBA"
fi

systemctl restart postgresql
echo "PostgreSQL remote connections enabled."
"""
    
    stdin, stdout, stderr = client.exec_command(script)
    print(stdout.read().decode('utf-8'))
    
finally:
    client.close()

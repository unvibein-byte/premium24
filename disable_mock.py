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
        # Remove any existing ENABLE_MOCK_PAYMENTS
        "sed -i '/ENABLE_MOCK_PAYMENTS/d' /opt/premium24-backend/.env",
        "sed -i '/WATCHPAY_/d' /opt/premium24-backend/.env",
        # Append real values
        """echo "ENABLE_MOCK_PAYMENTS=false" >> /opt/premium24-backend/.env""",
        """echo "WATCHPAY_BASE_URL=https://merchant.watchglb.com" >> /opt/premium24-backend/.env""",
        """echo "WATCHPAY_MERCHANT_ID=100528114" >> /opt/premium24-backend/.env""",
        """echo "WATCHPAY_CURRENCY=INR" >> /opt/premium24-backend/.env""",
        """echo "WATCHPAY_API_KEY=CTNB4ATD5XSZMKYFST1ED1HHY9JEUKEP" >> /opt/premium24-backend/.env""",
        
        # Add Firebase config to the backend so it doesn't fail google login
        "sed -i '/FIREBASE_/d' /opt/premium24-backend/.env",
        """echo 'FIREBASE_PROJECT_ID=typingwork24' >> /opt/premium24-backend/.env""",
        """echo 'FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@typingwork24.iam.gserviceaccount.com' >> /opt/premium24-backend/.env""",
        
        # Restart backend
        "pm2 restart premium24-backend"
    ]
    
    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()

finally:
    client.close()

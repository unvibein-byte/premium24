#!/bin/bash

echo "=== Premium24 Database Setup Script ==="

# Database credentials
DB_NAME="premium24"
DB_USER="premium24"
DB_PASS="@@@TypingWork24@@@"

echo "Setting up PostgreSQL database..."

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
   END IF;
END
\$\$;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
EOF

echo "Database and user created successfully!"

# Initialize schema
echo "Initializing database schema..."
psql -U $DB_USER -d $DB_NAME -f /opt/premium24-backend/schema.sql

echo "Schema initialized successfully!"

# Show results
echo "=== Database Contents ==="
psql -U $DB_USER -d $DB_NAME << 'EOF'
\dt
SELECT 'Users:' as info, COUNT(*) as count FROM auth_users
UNION ALL
SELECT 'Plans:', COUNT(*) FROM plans
UNION ALL
SELECT 'Withdrawals:', COUNT(*) FROM withdrawals
UNION ALL
SELECT 'Referrals:', COUNT(*) FROM referrals;

SELECT id, name, amount FROM plans ORDER BY amount;
EOF

echo "=== Setup Complete! ==="
echo "Your Premium24 database is ready with all features:"
echo "- Google OAuth login"
echo "- Premium user management"
echo "- Wallet system"
echo "- Referral system"
echo "- Withdrawal requests"
echo "- WhatsApp number storage"
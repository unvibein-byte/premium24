# Database Table Viewer - Premium24
# Run this on your VPS to see all database tables and data

echo "====================================="
echo "Premium24 Database Table Viewer"
echo "====================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database connection details
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_NAME="premium24"
DB_USER="premium24_user"

echo -e "${BLUE}Database Connection:${NC}"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Function to run SQL query
run_query() {
    local query="$1"
    local description="$2"

    echo -e "${YELLOW}$description${NC}"
    echo "Query: $query"
    echo ""

    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$query" 2>/dev/null || {
        echo -e "${RED}❌ Query failed. Make sure database is set up and password is correct.${NC}"
        echo "Set DB_PASSWORD variable or run: export DB_PASSWORD='your_password_here'"
        return 1
    }
    echo ""
}

# Check if password is set
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  DB_PASSWORD not set. Please set it:${NC}"
    echo "export DB_PASSWORD='your_database_password_here'"
    echo ""
    read -p "Enter database password: " DB_PASSWORD
    export DB_PASSWORD="$DB_PASSWORD"
fi

# Test connection
echo -e "${BLUE}Testing database connection...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check:"
    echo "1. PostgreSQL is running: systemctl status postgresql"
    echo "2. Database exists: createdb -U postgres premium24"
    echo "3. User exists: createuser -U postgres premium24_user"
    echo "4. Password is correct"
    exit 1
fi
echo ""

# Show all tables
run_query "\dt" "📋 All Database Tables"

# Show table structures
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Table Structures${NC}"
echo -e "${BLUE}========================================${NC}"

run_query "\d auth_users" "👤 Users Table Structure"
run_query "\d auth_refresh_tokens" "🔑 Refresh Tokens Table Structure"
run_query "\d payment_orders" "💳 Payment Orders Table Structure"
run_query "\d plans" "📋 Plans Table Structure"
run_query "\d withdrawals" "💰 Withdrawals Table Structure"
run_query "\d referrals" "👥 Referrals Table Structure"
run_query "\d user_activities" "📊 User Activities Table Structure"

# Show sample data
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Sample Data${NC}"
echo -e "${BLUE}========================================${NC}"

run_query "SELECT id, username, email, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal, created_at FROM auth_users LIMIT 10;" "👤 Recent Users (last 10)"

run_query "SELECT id, order_id, user_id, amount, currency, pay_type, status, created_at FROM payment_orders ORDER BY created_at DESC LIMIT 10;" "💳 Recent Payment Orders (last 10)"

run_query "SELECT id, name, amount, description, is_active FROM plans ORDER BY amount;" "📋 Available Plans"

run_query "SELECT id, user_id, amount, status, created_at FROM withdrawals ORDER BY created_at DESC LIMIT 10;" "💰 Recent Withdrawals (last 10)"

run_query "SELECT id, referrer_id, referred_id, reward_amount, created_at FROM referrals ORDER BY created_at DESC LIMIT 10;" "👥 Recent Referrals (last 10)"

run_query "SELECT id, user_id, event_type, event_source, created_at FROM user_activities ORDER BY created_at DESC LIMIT 10;" "📊 Recent User Activities (last 10)"

# Show statistics
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Database Statistics${NC}"
echo -e "${BLUE}========================================${NC}"

run_query "SELECT 'users' as table_name, COUNT(*) as count FROM auth_users UNION ALL SELECT 'payment_orders', COUNT(*) FROM payment_orders UNION ALL SELECT 'withdrawals', COUNT(*) FROM withdrawals UNION ALL SELECT 'referrals', COUNT(*) FROM referrals UNION ALL SELECT 'user_activities', COUNT(*) FROM user_activities;" "📊 Table Row Counts"

run_query "SELECT COUNT(*) as total_payments, SUM(amount) as total_amount, AVG(amount) as avg_amount FROM payment_orders WHERE status = 'completed';" "💰 Payment Statistics"

run_query "SELECT is_premium, COUNT(*) as count FROM auth_users GROUP BY is_premium;" "👤 Premium vs Free Users"

run_query "SELECT DATE(created_at) as date, COUNT(*) as registrations FROM auth_users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date DESC;" "📈 Recent Registrations (last 30 days)"

echo -e "${GREEN}✅ Database inspection complete!${NC}"
echo ""
echo -e "${YELLOW}💡 Useful commands:${NC}"
echo "  # View specific user details"
echo "  PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'SELECT * FROM auth_users WHERE id = 1;'"
echo ""
echo "  # View payment details for a user"
echo "  PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'SELECT * FROM payment_orders WHERE user_id = 1;'"
echo ""
echo "  # Clear all data (CAUTION!)"
echo "  PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'TRUNCATE auth_users, payment_orders, withdrawals, referrals, user_activities;'"

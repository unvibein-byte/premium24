# Test Backend Setup - Premium24
# Tests connectivity and database setup

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Premium24 Backend Health Check" -ForegroundColor Cyan  
Write-Host "=====================================" -ForegroundColor Green

Write-Host "`n📋 ENVIRONMENT VARIABLES" -ForegroundColor Yellow

# Check .env file
if (Test-Path "backend\.env") {
    Write-Host "✅ backend\.env found" -ForegroundColor Green
    
    $envContent = Get-Content "backend\.env"
    $checks = @{
        "DATABASE_URL" = $envContent | Select-String "^DATABASE_URL"
        "FIREBASE_PROJECT_ID" = $envContent | Select-String "FIREBASE_PROJECT_ID=typingwork24"
        "WATCHPAY_API_KEY" = $envContent | Select-String "WATCHPAY_API_KEY="
        "ACCESS_TOKEN_SECRET" = $envContent | Select-String "ACCESS_TOKEN_SECRET="
    }
    
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Write-Host "  ✅ $($check.Key) - Configured" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($check.Key) - Missing" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ backend\.env not found" -ForegroundColor Red
}

Write-Host "`n🔌 DATABASE CONNECTION TEST" -ForegroundColor Yellow

$dbUrl = (Get-Content "backend\.env" | Select-String "^DATABASE_URL").Line.Split("=")[1]
Write-Host "Database URL: $dbUrl"

# Extract host/port
if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(\w+)") {
    $user = $matches[1]
    $host = $matches[3]
    $port = $matches[4]
    $db = $matches[5]
    
    Write-Host "  User: $user"
    Write-Host "  Host: $host"
    Write-Host "  Port: $port"
    Write-Host "  Database: $db"
    
    # Test connection (requires psql installed)
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        Write-Host "`n  Testing PostgreSQL connection..." -ForegroundColor Cyan
        try {
            psql -h $host -p $port -U $user -d $db -c "SELECT 1" 2>&1 | Out-Null
            Write-Host "  ✅ Database connection successful!" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Database connection failed - Check VPS/local PostgreSQL" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  psql not installed - can't test connection" -ForegroundColor Yellow
        Write-Host "  Install PostgreSQL client tools to test" -ForegroundColor Gray
    }
}

Write-Host "`n📦 NODE DEPENDENCIES" -ForegroundColor Yellow

if (Test-Path "backend\node_modules") {
    Write-Host "✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "❌ node_modules not found - Run: cd backend && npm install" -ForegroundColor Red
}

Write-Host "`n⚡ READY TO START?" -ForegroundColor Magenta
Write-Host "`nRun these commands:" -ForegroundColor Cyan
Write-Host "  cd backend"
Write-Host "  npm install  (if needed)"
Write-Host "  npm run dev"

Write-Host "`n✨ Backend will start on http://localhost:4000`n" -ForegroundColor Green

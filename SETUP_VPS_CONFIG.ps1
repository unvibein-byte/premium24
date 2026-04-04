# VPS Database Setup Helper - Premium24 Backend

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Premium24 - Hostinger VPS Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Green

Write-Host "`n📌 VPS DETAILS" -ForegroundColor Yellow
Write-Host "IP Address: 72.60.99.29"
Write-Host "Hostname: srv992795.hstgr.cloud"
Write-Host "Domain: typingwork24.com"

Write-Host "`n📋 SETUP CHECKLIST" -ForegroundColor Yellow
Write-Host "[1] SSH into your VPS and configure PostgreSQL"
Write-Host "[2] Create database and user (see HOSTINGER_VPS_POSTGRESQL_SETUP.md)"
Write-Host "[3] Generate secure credentials below"
Write-Host "[4] Update .env.hostinger with your values"
Write-Host "[5] Copy .env.hostinger to .env"
Write-Host "[6] Run: npm install && npm run dev"

Write-Host "`n🔐 GENERATING SECURE CREDENTIALS" -ForegroundColor Magenta
Write-Host "`nFollow these steps to generate random secrets:" -ForegroundColor Cyan

$accessSecret = -join ((0..31) | ForEach-Object { [char]((33..126) | Get-Random) })
$refreshSecret = -join ((0..31) | ForEach-Object { [char]((33..126) | Get-Random) })
$setupKey = -join ((0..31) | ForEach-Object { [char]((33..126) | Get-Random) })

Write-Host "`n✅ Generated Secrets (Copy these into .env.hostinger):" -ForegroundColor Green
Write-Host "`nACCESS_TOKEN_SECRET=$accessSecret" -ForegroundColor Cyan
Write-Host "REFRESH_TOKEN_SECRET=$refreshSecret" -ForegroundColor Cyan
Write-Host "SETUP_API_KEY=$setupKey" -ForegroundColor Cyan

Write-Host "`n📝 DATABASE CREDENTIALS TO SET ON VPS" -ForegroundColor Magenta
Write-Host "Username: premium24_user"
Write-Host "Database: premium24"
Write-Host "Replace: [YOUR_PASSWORD] with a strong password you choose"

Write-Host "`n🔗 CONNECTION STRING FORMAT" -ForegroundColor Yellow
Write-Host "postgresql://premium24_user:YOUR_PASSWORD@72.60.99.29:5432/premium24"

Write-Host "`n📂 NEXT STEPS" -ForegroundColor Green
Write-Host "1. Open backend\.env.hostinger"
Write-Host "2. Replace 'CHANGE_ME_*' with generated secrets above"
Write-Host "3. Replace 'CHANGE_TO_YOUR_PASSWORD' with your chosen password"
Write-Host "4. Copy to backend\.env"
Write-Host "5. Run: cd backend && npm run dev"

Write-Host "`n💡 For detailed VPS setup, see: HOSTINGER_VPS_POSTGRESQL_SETUP.md"
Write-Host "`n✨ Setup ready!`n" -ForegroundColor Green

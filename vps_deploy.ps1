# Premium24 VPS Deployment Script (PowerShell)
# Usage: .\vps_deploy.ps1 -VpsIP "your.vps.ip" -VpsUser "root"

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsIP,
    
    [Parameter(Mandatory=$false)]
    [string]$VpsUser = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$BackendPort = "4000"
)

$BackendDir = "D:\android development\premium24\backend"
$VpsBackendDir = "/opt/premium24-backend"

Write-Host "🚀 Premium24 VPS Deployment" -ForegroundColor Green
Write-Host "VPS: $VpsIP`n"

# Check if SSH/SCP available
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH not found. Install OpenSSH Client or Git for Windows" -ForegroundColor Red
    exit 1
}

# 1. Upload backend
Write-Host "📦 Uploading backend files..." -ForegroundColor Yellow
scp -r "$BackendDir\*" "${VpsUser}@${VpsIP}:${VpsBackendDir}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed" -ForegroundColor Red
    exit 1
}

# 2. Install dependencies and start server
Write-Host "📚 Installing dependencies on VPS..." -ForegroundColor Yellow
ssh ${VpsUser}@${VpsIP} "cd $VpsBackendDir && npm install --production"

Write-Host "⚙️ Starting backend server..." -ForegroundColor Yellow
ssh ${VpsUser}@${VpsIP} "cd $VpsBackendDir && npm install -g pm2 && pm2 start index.js --name premium24-backend && pm2 save && pm2 startup"

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "Backend running at: http://${VpsIP}:${BackendPort}" -ForegroundColor Cyan
Write-Host "`n📝 Configure these in VPS .env file:" -ForegroundColor Yellow
Write-Host "  - DATABASE_URL (PostgreSQL connection)"
Write-Host "  - Firebase credentials"
Write-Host "  - GOOGLE_CLIENT_SECRET"
Write-Host "  - Domain CORS_ORIGIN"

Write-Host "`n🔗 SSH to VPS and edit .env:" -ForegroundColor Yellow
Write-Host "ssh ${VpsUser}@${VpsIP}" -ForegroundColor Gray
Write-Host "nano /opt/premium24-backend/.env" -ForegroundColor Gray

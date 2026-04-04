# Premium24 VPS Deployment Script (Windows)
# Run this from PowerShell to deploy to your VPS

param(
    [string]$VpsHost = "72.60.99.29",
    [string]$VpsUser = "root",
    [switch]$SkipFirebaseUpload,
    [switch]$TestOnly
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Premium24 VPS Deployment (Windows)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Green

# Check if SSH is available
if (!(Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH client not found. Please install OpenSSH or use WSL." -ForegroundColor Red
    exit 1
}

# Check if SCP is available
if (!(Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SCP client not found. Please install OpenSSH or use WSL." -ForegroundColor Red
    exit 1
}

Write-Host "✅ SSH/SCP available" -ForegroundColor Green

# Check if firebase-key.json exists
$firebaseKeyPath = "backend\firebase-key.json"
if (!(Test-Path $firebaseKeyPath) -and !$SkipFirebaseUpload) {
    Write-Host "❌ firebase-key.json not found in backend/ folder" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get Firebase key:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://console.firebase.google.com/project/typingwork24/settings/serviceaccounts/adminsdk" -ForegroundColor Yellow
    Write-Host "2. Click 'Generate New Private Key'" -ForegroundColor Yellow
    Write-Host "3. Save as: backend/firebase-key.json" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run with -SkipFirebaseUpload to skip this step" -ForegroundColor Yellow
    exit 1
}

if (Test-Path $firebaseKeyPath) {
    Write-Host "✅ Firebase key found: $firebaseKeyPath" -ForegroundColor Green
}

# Test connection to VPS
Write-Host ""
Write-Host "🔍 Testing VPS connection..." -ForegroundColor Yellow
try {
    $testResult = ssh -o ConnectTimeout=10 -o BatchMode=yes "$VpsUser@$VpsHost" "echo 'SSH connection successful'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ VPS connection successful" -ForegroundColor Green
    } else {
        Write-Host "❌ VPS connection failed" -ForegroundColor Red
        Write-Host "Error: $testResult" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please check:" -ForegroundColor Yellow
        Write-Host "1. VPS IP is correct: $VpsHost" -ForegroundColor Yellow
        Write-Host "2. SSH key is set up or password authentication works" -ForegroundColor Yellow
        Write-Host "3. Firewall allows SSH (port 22)" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ VPS connection test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($TestOnly) {
    Write-Host ""
    Write-Host "🧪 Test mode - Connection successful!" -ForegroundColor Green
    exit 0
}

# Upload deployment script
Write-Host ""
Write-Host "📤 Uploading deployment script..." -ForegroundColor Yellow
try {
    scp "vps-deploy.sh" "$VpsUser@$VpsHost`:~/"
    Write-Host "✅ Deployment script uploaded" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to upload deployment script: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Upload Firebase key if it exists
if ((Test-Path $firebaseKeyPath) -and !$SkipFirebaseUpload) {
    Write-Host ""
    Write-Host "📤 Uploading Firebase key..." -ForegroundColor Yellow
    try {
        scp $firebaseKeyPath "$VpsUser@$VpsHost`:~/premium24/backend/" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Firebase key uploaded" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to upload Firebase key" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Failed to upload Firebase key: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Make deployment script executable and run it
Write-Host ""
Write-Host "🚀 Running deployment on VPS..." -ForegroundColor Magenta
Write-Host "This will take several minutes..." -ForegroundColor Yellow
Write-Host ""

try {
    ssh "$VpsUser@$VpsHost" "chmod +x vps-deploy.sh && ./vps-deploy.sh"
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Your backend is now running at:" -ForegroundColor Cyan
        Write-Host "   http://$VpsHost`:4000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 To view database tables, run on VPS:" -ForegroundColor Yellow
        Write-Host "   cd premium24 && chmod +x view-database-tables.sh" -ForegroundColor Yellow
        Write-Host "   ./view-database-tables.sh" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🔍 Useful commands:" -ForegroundColor Yellow
        Write-Host "   ssh $VpsUser@$VpsHost 'pm2 status'" -ForegroundColor Yellow
        Write-Host "   ssh $VpsUser@$VpsHost 'pm2 logs premium24-backend'" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Deployment failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Deployment execution failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

#!/usr/bin/env powershell
# Premium24 Automated Deployment Script for Windows
# This script builds your code and deploys it to your Hostinger VPS
#
# Usage: powershell -ExecutionPolicy Bypass -File deploy-auto.ps1
#
# Prerequisites:
# - SSH access to VPS (72.60.99.29)
# - Git Bash or OpenSSH installed (for scp command)
# - Node.js installed locally

param(
    [string]$VpsIp = "72.60.99.29",
    [string]$VpsUser = "root",
    [string]$AppDir = "/srv/premium24",
    [string]$ProjectPath = "D:\android development\premium24"
)

# Configuration
$Colors = @{
    Info    = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error   = "Red"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    Write-Host $Message -ForegroundColor $Colors[$Type]
}

function Test-Prerequisites {
    Write-Status "Checking prerequisites..." "Info"
    
    # Check Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Status "ERROR: Node.js not installed! Please install Node.js first." "Error"
        exit 1
    }
    Write-Status "✓ Node.js installed" "Success"
    
    # Check npm
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Status "ERROR: npm not installed!" "Error"
        exit 1
    }
    Write-Status "✓ npm installed" "Success"
    
    # Check SSH/SCP
    if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
        Write-Status "WARNING: ssh not in PATH. You may need Git Bash or OpenSSH installed." "Warning"
    } else {
        Write-Status "✓ SSH available" "Success"
    }
    
    # Check if project path exists
    if (-not (Test-Path $ProjectPath)) {
        Write-Status "ERROR: Project path not found: $ProjectPath" "Error"
        exit 1
    }
    Write-Status "✓ Project path found" "Success"
}

function Build-Frontend {
    Write-Status "`n[1/5] Building frontend..." "Info"
    
    Push-Location $ProjectPath
    try {
        # Install dependencies
        Write-Status "Installing dependencies..." "Info"
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Status "ERROR: npm install failed" "Error"
            exit 1
        }
        
        # Build
        Write-Status "Building..." "Info"
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Status "ERROR: npm run build failed" "Error"
            exit 1
        }
        
        Write-Status "✓ Frontend built successfully" "Success"
    }
    finally {
        Pop-Location
    }
}

function Upload-Code {
    Write-Status "`n[2/5] Uploading code to VPS..." "Info"
    
    $SshTarget = "$VpsUser@$VpsIp"
    
    # Create app directory
    Write-Status "Creating app directory on VPS..." "Info"
    ssh $SshTarget "mkdir -p $AppDir && chown -R $VpsUser:$VpsUser $AppDir"
    
    # Upload backend
    Write-Status "Uploading backend..." "Info"
    scp -r "$ProjectPath\backend\*" "$SshTarget`:$AppDir/backend/"
    if ($LASTEXITCODE -ne 0) {
        Write-Status "ERROR: Failed to upload backend" "Error"
        exit 1
    }
    
    # Upload frontend dist
    Write-Status "Uploading frontend build..." "Info"
    scp -r "$ProjectPath\dist\*" "$SshTarget`:$AppDir/dist/"
    if ($LASTEXITCODE -ne 0) {
        Write-Status "ERROR: Failed to upload frontend dist" "Error"
        exit 1
    }
    
    # Upload package.json and config files
    Write-Status "Uploading configuration files..." "Info"
    scp "$ProjectPath\package.json" "$SshTarget`:$AppDir/"
    scp "$ProjectPath\vite.config.js" "$SshTarget`:$AppDir/"
    
    Write-Status "✓ Code uploaded successfully" "Success"
}

function Setup-Backend {
    Write-Status "`n[3/5] Setting up backend on VPS..." "Info"
    
    $SshTarget = "$VpsUser@$VpsIp"
    
    # Install backend dependencies
    Write-Status "Installing backend dependencies..." "Info"
    ssh $SshTarget "cd $AppDir/backend && npm install --production"
    if ($LASTEXITCODE -ne 0) {
        Write-Status "ERROR: Failed to install backend dependencies" "Error"
        exit 1
    }
    
    # Check if .env exists
    Write-Status "Checking backend .env..." "Info"
    $EnvExists = ssh $SshTarget "test -f $AppDir/backend/.env && echo 'yes' || echo 'no'"
    
    if ($EnvExists -eq "no") {
        Write-Status "Creating .env template (you must edit this on VPS!)" "Warning"
        ssh $SshTarget "cp $AppDir/backend/env.example $AppDir/backend/.env"
        Write-Status "⚠ .env created from template. You must edit it on VPS with your real credentials!" "Warning"
    } else {
        Write-Status "✓ .env already exists" "Success"
    }
    
    Write-Status "✓ Backend setup complete" "Success"
}

function Restart-Services {
    Write-Status "`n[4/5] Restarting services on VPS..." "Info"
    
    $SshTarget = "$VpsUser@$VpsIp"
    
    # Check if PM2 is installed
    Write-Status "Checking PM2..." "Info"
    ssh $SshTarget "which pm2 > /dev/null || sudo npm install -g pm2"
    
    # Stop existing PM2 process
    Write-Status "Stopping existing backend..." "Info"
    ssh $SshTarget "pm2 stop premium24-api 2>/dev/null || true"
    
    # Start backend
    Write-Status "Starting backend with PM2..." "Info"
    ssh $SshTarget "cd $AppDir/backend && pm2 start index.js --name 'premium24-api' --no-autorestart"
    if ($LASTEXITCODE -ne 0) {
        Write-Status "ERROR: Failed to start backend" "Error"
        exit 1
    }
    
    # Save PM2 configuration
    Write-Status "Saving PM2 configuration..." "Info"
    ssh $SshTarget "pm2 save"
    
    # Reload Nginx
    Write-Status "Reloading Nginx..." "Info"
    ssh $SshTarget "sudo systemctl reload nginx 2>/dev/null || true"
    
    Write-Status "✓ Services restarted" "Success"
}

function Verify-Deployment {
    Write-Status "`n[5/5] Verifying deployment..." "Info"
    
    $SshTarget = "$VpsUser@$VpsIp"
    
    # Check backend status
    Write-Status "Checking backend status..." "Info"
    ssh $SshTarget "pm2 status"
    
    # Show recent logs
    Write-Status "`nRecent backend logs:" "Info"
    ssh $SshTarget "pm2 logs premium24-api --lines 20 --nostream"
    
    Write-Status "✓ Deployment verification complete" "Success"
}

function Show-Summary {
    Write-Status "`n========================================" "Success"
    Write-Status "DEPLOYMENT COMPLETE!" "Success"
    Write-Status "========================================" "Success"
    Write-Status "`nYour application is now deployed to:" "Info"
    Write-Status "  Frontend: https://typingwork24.in" "Success"
    Write-Status "  Backend API: https://typingwork24.in/api/" "Success"
    Write-Status "`nIMPORTANT - Next Steps:" "Warning"
    Write-Status "1. SSH into VPS and edit .env file:" "Info"
    Write-Host "   ssh $VpsUser@$VpsIp"
    Write-Host "   nano $AppDir/backend/.env"
    Write-Status "`n2. Update these fields with REAL values:" "Info"
    Write-Host "   - FIREBASE_PROJECT_ID"
    Write-Host "   - FIREBASE_CLIENT_EMAIL"
    Write-Host "   - FIREBASE_PRIVATE_KEY"
    Write-Host "   - GOOGLE_CLIENT_SECRET"
    Write-Host "   - WATCHPAY_API_KEY (get from WatchPay support)"
    Write-Status "`n3. Restart backend:" "Info"
    Write-Host "   pm2 restart premium24-api"
    Write-Status "`n4. Contact WatchPay to get your Payment Key:" "Warning"
    Write-Host "   Merchant ID: 100528114"
    Write-Host "   Server IP: 72.60.99.29"
    Write-Status "`nUseful Commands:" "Info"
    Write-Host "   pm2 status                    # View running processes"
    Write-Host "   pm2 logs premium24-api        # View backend logs"
    Write-Host "   pm2 restart premium24-api     # Restart backend"
    Write-Status "`n========================================" "Success"
}

# Main execution
function Main {
    Clear-Host
    Write-Status "╔════════════════════════════════════════╗" "Success"
    Write-Status "║  Premium24 Automated Deployment       ║" "Success"
    Write-Status "║  VPS: $VpsIp                        ║" "Success"
    Write-Status "╚════════════════════════════════════════╝" "Success"
    
    Write-Status "`nConfiguration:" "Info"
    Write-Host "  Project: $ProjectPath"
    Write-Host "  VPS IP: $VpsIp"
    Write-Host "  VPS User: $VpsUser"
    Write-Host "  App Dir: $AppDir"
    
    Write-Status "`nPress Enter to start deployment (Ctrl+C to cancel)..." "Warning"
    Read-Host
    
    Test-Prerequisites
    Build-Frontend
    Upload-Code
    Setup-Backend
    Restart-Services
    Verify-Deployment
    Show-Summary
}

# Run main function
Main

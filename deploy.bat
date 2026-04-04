@echo off
REM Premium24 Automated Deployment Launcher
REM Run this file to deploy your app to the VPS

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════╗
echo ║  Premium24 Automated Deployment        ║
echo ║  VPS: 72.60.99.29                      ║
echo ║  Domains: typingwork24.in              ║
echo ║           typingwork24.com             ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if PowerShell is available
powershell -NoProfile -Command "exit" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is not available
    echo Please install PowerShell or run the PowerShell script manually
    pause
    exit /b 1
)

REM Run the PowerShell deployment script
echo Starting deployment...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-auto.ps1"

if errorlevel 1 (
    echo.
    echo Deployment failed!
    pause
    exit /b 1
) else (
    echo.
    echo Deployment completed!
    pause
)

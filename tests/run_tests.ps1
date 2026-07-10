# EnglishTools E2E Automation Test Suite PowerShell Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  EnglishTools E2E Automation Test Suite Launcher" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check local PHP
Write-Host "[1/3] Checking local PHP installation..." -ForegroundColor Yellow
$phpCheck = Get-Command php -ErrorAction SilentlyContinue
if ($null -eq $phpCheck) {
    Write-Host ""
    Write-Host "❌ ERROR: PHP is not installed or not in your system PATH." -ForegroundColor Red
    Write-Host "Please make sure PHP is installed so we can serve the web files locally." -ForegroundColor Red
    Write-Host "Alternatively, host this workspace on any local server and open:" -ForegroundColor Red
    Write-Host "http://your-local-server-ip/tests/run_tests.html" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

# 2. Start PHP server
Write-Host "[2/3] Starting Local PHP Web Server on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
$serverProcess = Start-Process php -ArgumentList "-S 127.0.0.1:8000" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

# 3. Launch browser
Write-Host "[3/3] Launching automation runner in your default browser..." -ForegroundColor Yellow
Start-Process "http://127.0.0.1:8000/tests/run_tests.html"
Write-Host ""
Write-Host "✅ Server started!" -ForegroundColor Green
Write-Host ""
Write-Host "Keep this PowerShell window open while running tests." -ForegroundColor Green
Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Yellow
Write-Host "PRESS ENTER KEY TO STOP THE PHP WEB SERVER..." -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "🛑 Shutting down PHP Web Server..." -ForegroundColor Red
Stop-Process -Id $serverProcess.Id -Force
Write-Host "Done."
Start-Sleep -Seconds 1

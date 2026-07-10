@echo off
title EnglishTools Automation Test Launcher
echo ===================================================
echo   EnglishTools E2E Automation Test Suite Launcher
echo ===================================================
echo.
echo [1/3] Checking local PHP installation...
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: PHP is not installed or not in your system PATH.
    echo.
    echo Please make sure PHP is installed so we can serve the web files locally.
    echo Alternatively, host this workspace on any local server and open:
    echo http://your-local-server-ip/tests/run_tests.html
    echo.
    pause
    exit /b 1
)

echo [2/3] Starting Local PHP Web Server on http://127.0.0.1:8000 ...
start /b php -S 127.0.0.1:8000 >nul 2>&1
timeout /t 2 >nul

echo [3/3] Launching automation runner in your default browser...
start http://127.0.0.1:8000/tests/run_tests.html
echo.
echo ✅ Server started! 
echo.
echo Keep this console window open while running tests.
echo.
echo ---------------------------------------------------
echo PRESS ANY KEY TO STOP THE PHP WEB SERVER...
echo ---------------------------------------------------
pause >nul

echo.
echo 🛑 Shutting down PHP Web Server...
taskkill /f /im php.exe >nul 2>&1
echo Done.
timeout /t 1 >nul
exit

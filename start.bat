@echo off
setlocal enabledelayedexpansion
title FB AI Page Manager
cd /d "%~dp0"

echo ============================================
echo   FB AI Page Manager - Khoi dong tu dong
echo ============================================
echo.

REM ---- 1. Kiem tra Node.js ----
where node >nul 2>nul
if errorlevel 1 (
    echo [LOI] Chua cai Node.js tren may nay.
    echo Vui long tai va cai Node.js ^(ban LTS^) tai: https://nodejs.org
    echo Sau khi cai xong, chay lai file start.bat nay.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Da tim thay Node.js phien ban: %%v
echo.

REM ---- 2. Cai dependencies neu chua co ----
if not exist "node_modules" (
    echo Dang cai dat thu vien can thiet ^(npm install^)... viec nay co the mat vai phut.
    call npm install
    if errorlevel 1 (
        echo [LOI] Cai dat that bai. Xem log ben tren de biet chi tiet.
        pause
        exit /b 1
    )
) else (
    echo Thu vien da duoc cai dat, bo qua buoc npm install.
)
echo.

REM ---- 3. Tao file .env neu chua co ----
if not exist ".env" (
    echo Chua co file .env, dang tao tu .env.example...
    copy ".env.example" ".env" >nul
    echo.
    echo [QUAN TRONG] Vui long mo file .env bang Notepad va dien day du:
    echo   - FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN, FB_APP_ID, FB_APP_SECRET
    echo   - ANTHROPIC_API_KEY
    echo   - DASHBOARD_USER, DASHBOARD_PASSWORD
    echo Xem huong dan chi tiet trong file README.md.
    echo.
    notepad ".env"
    echo Sau khi luu file .env, nhan phim bat ky de tiep tuc khoi dong...
    pause >nul
)
echo.

REM ---- 4. Mo trinh duyet sau vai giay ----
echo Dang khoi dong server, trinh duyet se tu mo sau vai giay...
start "" cmd /c "timeout /t 4 >nul && start http://localhost:3000"

REM ---- 5. Chay server (giu cua so nay mo) ----
call npm start

echo.
echo Server da dung. Nhan phim bat ky de dong cua so nay.
pause >nul

@echo off
setlocal enabledelayedexpansion
title FB AI Page Manager
cd /d "%~dp0"

echo ============================================
echo   FB AI Page Manager - Khoi dong tu dong
echo ============================================
echo.

REM ============================================================
REM 1. Kiem tra Node.js - neu chua co thi tu dong tai va cai dat
REM ============================================================
where node >nul 2>nul
if errorlevel 1 (
    echo Chua tim thay Node.js. He thong se tu dong tai va cai dat...
    echo.

    REM --- Can quyen Admin de cai phan mem. Tu nang quyen neu chua phai Admin. ---
    net session >nul 2>nul
    if errorlevel 1 (
        echo Dang yeu cau quyen Administrator ^(se hien hop thoai UAC^)...
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
        exit /b
    )

    set "NODE_INSTALLED=0"

    REM --- Cach 1: dung winget (co san tren Windows 10/11 ban moi) ---
    where winget >nul 2>nul
    if not errorlevel 1 (
        echo Dang cai Node.js LTS bang winget, vui long doi...
        winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        if not errorlevel 1 set "NODE_INSTALLED=1"
    )

    REM --- Cach 2: neu winget khong co/that bai, tai file .msi truc tiep tu nodejs.org ---
    if "!NODE_INSTALLED!"=="0" (
        echo Dang tai bo cai Node.js truc tiep tu nodejs.org, vui long doi...
        set "NODE_MSI=%TEMP%\node-installer.msi"

        powershell -NoProfile -Command ^
            "$ErrorActionPreference='Stop';" ^
            "$arch = if ([Environment]::Is64BitOperatingSystem) {'x64'} else {'x86'};" ^
            "$ver = (Invoke-RestMethod 'https://nodejs.org/dist/index.json' | Where-Object { $_.lts -ne $false } | Select-Object -First 1).version;" ^
            "$url = \"https://nodejs.org/dist/$ver/node-$ver-$arch.msi\";" ^
            "Write-Host \"Dang tai: $url\";" ^
            "Invoke-WebRequest -Uri $url -OutFile '%NODE_MSI%'"

        if exist "%NODE_MSI%" (
            echo Dang cai dat Node.js, vui long doi khong tat cua so...
            msiexec /i "%NODE_MSI%" /quiet /norestart
            del /f /q "%NODE_MSI%" >nul 2>nul
            set "NODE_INSTALLED=1"
        )
    )

    REM --- Cap nhat lai bien PATH cho phien lam viec hien tai ---
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs"

    where node >nul 2>nul
    if errorlevel 1 (
        echo.
        echo [LOI] Khong the tu dong cai Node.js.
        echo Vui long tai va cai thu cong tai: https://nodejs.org ^(ban LTS^)
        echo roi chay lai file start.bat nay.
        pause
        exit /b 1
    )

    echo.
    echo Da cai dat Node.js thanh cong!
)

for /f "tokens=*" %%v in ('node -v') do echo Da tim thay Node.js phien ban: %%v
echo.

REM ============================================================
REM 2. Cai dependencies neu chua co
REM ============================================================
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

REM ============================================================
REM 3. Tao file .env neu chua co
REM ============================================================
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

REM ============================================================
REM 4. Mo trinh duyet sau vai giay
REM ============================================================
echo Dang khoi dong server, trinh duyet se tu mo sau vai giay...
start "" cmd /c "timeout /t 4 >nul && start http://localhost:3000"

REM ============================================================
REM 5. Chay server (giu cua so nay mo)
REM ============================================================
call npm start

echo.
echo Server da dung. Nhan phim bat ky de dong cua so nay.
pause >nul

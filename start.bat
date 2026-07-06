@echo off
setlocal enabledelayedexpansion
title FB AI Page Manager
cd /d "%~dp0"

echo ============================================
echo   FB AI Page Manager - Khoi dong tu dong
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto need_node
goto node_ready

:need_node
net session >nul 2>nul
if errorlevel 1 goto elevate
goto do_install

:elevate
echo Chua tim thay Node.js tren may nay.
echo He thong can quyen Administrator de tu dong cai dat Node.js.
echo Mot cua so moi se mo va hoi xac nhan ^(UAC^) - vui long bam "Yes".
timeout /t 3 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b

:do_install
echo Dang tai va cai dat Node.js LTS, vui long doi ^(co the mat vai phut^)...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-node.ps1"

set "PATH=%PATH%;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs"
where node >nul 2>nul
if errorlevel 1 goto install_failed
echo.
echo Da cai dat Node.js thanh cong!
echo.
goto node_ready

:install_failed
echo.
echo [LOI] Khong the tu dong cai Node.js.
echo Vui long tai va cai thu cong tai https://nodejs.org roi chay lai start.bat
pause
exit /b 1

:node_ready
for /f "tokens=*" %%v in ('node -v') do echo Da tim thay Node.js phien ban: %%v
echo.

if exist "node_modules" goto deps_ready
echo Dang cai dat thu vien can thiet, vui long doi ^(co the mat vai phut^)...
call npm install
if errorlevel 1 goto deps_failed
goto deps_ready

:deps_failed
echo [LOI] Cai dat thu vien that bai. Xem log ben tren de biet chi tiet.
pause
exit /b 1

:deps_ready
echo Thu vien da san sang.
echo.

if exist ".env" goto env_ready
echo Chua co file .env, dang tao tu .env.example...
copy ".env.example" ".env" >nul
echo.
echo [QUAN TRONG] Vui long dien day du thong tin vao file .env vua duoc mo:
echo   - FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN, FB_APP_ID, FB_APP_SECRET
echo   - ANTHROPIC_API_KEY
echo   - DASHBOARD_USER, DASHBOARD_PASSWORD
echo Xem huong dan chi tiet trong README.md
echo.
notepad ".env"
echo Sau khi luu file .env, nhan phim bat ky de tiep tuc khoi dong...
pause >nul

:env_ready
echo.
echo Dang khoi dong server, trinh duyet se tu mo sau vai giay...
start "" cmd /c "timeout /t 4 >nul && start http://localhost:3000"

call npm start

echo.
echo Server da dung. Nhan phim bat ky de dong cua so nay.
pause >nul

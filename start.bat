@echo off
REM Neu cua so nay bi dong dot ngot vi loi ben trong, ban se khong kip doc
REM thong bao loi. De tranh dieu do, lan chay dau tien se tu mo lai chinh no
REM trong mot cua so cmd "giu nguyen" - khong bao gio tu dong tat.
if defined FB_AI_PERSISTENT goto main
set "FB_AI_PERSISTENT=1"
cmd /k call "%~f0"
exit /b

:main
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
echo.
goto node_ready

:node_ready
REM Tu do tim thu muc cai Node.js thuc te tren dia, khong phu thuoc vao viec
REM bien PATH cua cua so cmd hien tai da duoc refresh hay chua - winget/msiexec
REM cap nhat PATH o registry, nhung cua so cmd dang chay se khong tu thay ngay.
set "NODEDIR="
for /f "delims=" %%p in ('where node 2^>nul') do if not defined NODEDIR set "NODEDIR=%%~dpp"
if defined NODEDIR goto have_nodedir
if exist "%ProgramFiles%\nodejs\node.exe" set "NODEDIR=%ProgramFiles%\nodejs\"
if not defined NODEDIR if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODEDIR=%ProgramFiles(x86)%\nodejs\"

:have_nodedir
if not defined NODEDIR goto install_failed
set "PATH=%PATH%;%NODEDIR%"

for /f "tokens=*" %%v in ('"%NODEDIR%node.exe" -v') do echo Da tim thay Node.js phien ban: %%v
echo.
goto deps_check

:install_failed
echo.
echo [LOI] Khong the tu dong cai Node.js.
echo Vui long tai va cai thu cong tai https://nodejs.org roi chay lai start.bat
pause
exit /b 1

:deps_check
if exist "node_modules" goto deps_ready
echo Dang cai dat thu vien can thiet, vui long doi ^(co the mat vai phut^)...
call "%NODEDIR%npm.cmd" install
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

call "%NODEDIR%npm.cmd" start

echo.
echo Server da dung. Nhan phim bat ky de dong cua so nay.
pause >nul

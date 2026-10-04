@echo off
rem Keep this file ASCII-only: cmd reads it in the OEM code page, not UTF-8.
cd /d "%~dp0"
echo.>> collect.log
echo ===== %date% %time% =====>> collect.log

rem Docker Desktop can come up a few minutes after boot/login: wait up to 5 min for Postgres (localhost:5432)
powershell -NoProfile -Command "for ($i = 0; $i -lt 30; $i++) { $c = New-Object Net.Sockets.TcpClient; try { $c.Connect('localhost', 5432); exit 0 } catch { Start-Sleep 10 } finally { $c.Close() } }; exit 1"
if errorlevel 1 (
  echo [SKIP] DB not reachable at localhost:5432 after 5 min - is Docker Desktop running?>> collect.log
  exit /b 1
)

rem npm is itself a .cmd: without "call" control never returns to this script
call npm run collect >> collect.log 2>&1
set RESULT=%errorlevel%
echo ===== done %date% %time% (exit %RESULT%) =====>> collect.log
exit /b %RESULT%

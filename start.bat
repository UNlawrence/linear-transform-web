@echo off
cd /d "%~dp0"
set PY=python

where python >nul 2>&1
if errorlevel 1 (
    set PY=py
    where py >nul 2>&1
    if errorlevel 1 goto nopython
)

set PORT=8791
start "" "http://127.0.0.1:%PORT%/"
echo Local server: http://127.0.0.1:%PORT%/
echo Close this window to stop.
%PY% -m http.server %PORT%
exit /b 0

:nopython
echo Python not found. Open the online version instead:
echo   https://unlawrence.github.io/linear-transform-web/
echo.
pause

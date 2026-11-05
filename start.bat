@echo off
setlocal
cd /d "%~dp0"

set "NPM=C:\Program Files\nodejs\npm.cmd"
if not exist "%NPM%" set "NPM=npm.cmd"

if not exist "node_modules\" (
  echo [1/2] Installing dependencies...
  call "%NPM%" install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed. Please check your Node.js installation.
    pause
    exit /b 1
  )
)

echo [2/2] Starting xitora portfolio...
call "%NPM%" run dev

endlocal

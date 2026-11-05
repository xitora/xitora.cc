@echo off
setlocal
cd /d "%~dp0"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo This folder is not a Git repository.
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current') do set "DEPLOY_BRANCH=%%b"
if not "%DEPLOY_BRANCH%"=="main" (
  echo Switch to main before publishing a production update.
  exit /b 1
)

call npm.cmd run build
if errorlevel 1 exit /b 1

echo Pushing committed changes to GitHub. Vercel will deploy main automatically.
git push origin main
if errorlevel 1 exit /b 1
endlocal

@echo off
setlocal

cd /d "%~dp0windows-float"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run Teacher FLOAT for Windows.
  echo Install the Windows LTS version from https://nodejs.org/
  echo Then double-click this file again.
  pause
  exit /b 1
)

if not exist "node_modules\electron" (
  echo Installing Windows FLOAT dependencies. This only happens the first time.
  npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Check your internet connection, then try again.
    pause
    exit /b 1
  )
)

npm start

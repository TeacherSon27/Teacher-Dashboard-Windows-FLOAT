@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is required on this build computer.
  echo Install it from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

echo Preparing app files...
if exist "windows-float\app-files" rmdir /s /q "windows-float\app-files"
mkdir "windows-float\app-files"
mkdir "windows-float\app-files\assets"
mkdir "windows-float\app-files\feature-widget-assets"
mkdir "windows-float\app-files\game-assets"

copy /y "teacher-dashboard-enhanced.html" "windows-float\app-files\teacher-dashboard-enhanced.html" >nul
xcopy /e /i /y "assets" "windows-float\app-files\assets" >nul
xcopy /e /i /y "feature-widget-assets" "windows-float\app-files\feature-widget-assets" >nul
xcopy /e /i /y "game-assets" "windows-float\app-files\game-assets" >nul

cd /d "%~dp0windows-float"

if not exist "node_modules\electron" (
  echo Installing build dependencies. This only happens the first time.
  npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Check your internet connection, then try again.
    pause
    exit /b 1
  )
)

echo Building Teacher FLOAT.exe...
npm run build:win
if errorlevel 1 (
  echo.
  echo Build failed.
  pause
  exit /b 1
)

cd /d "%~dp0"
if exist "windows-float\dist\Teacher FLOAT.exe" (
  copy /y "windows-float\dist\Teacher FLOAT.exe" "Teacher FLOAT.exe" >nul
  echo.
  echo Done. Your portable app is:
  echo %~dp0Teacher FLOAT.exe
) else (
  echo.
  echo Build finished, but Teacher FLOAT.exe was not found in windows-float\dist.
)

pause

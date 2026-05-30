@echo off
setlocal

pushd "%~dp0" >nul

if not exist "teacher-dashboard-enhanced.html" (
  echo Could not find teacher-dashboard-enhanced.html in:
  echo %~dp0
  echo.
  echo Keep this builder in the same folder as the dashboard HTML and asset folders.
  pause
  popd >nul
  exit /b 1
)

if not exist "assets" (
  echo Could not find the assets folder.
  pause
  popd >nul
  exit /b 1
)

if not exist "feature-widget-assets" (
  echo Could not find the feature-widget-assets folder.
  pause
  popd >nul
  exit /b 1
)

if not exist "feature-widget-assets\lucky-balls" (
  echo Could not find feature-widget-assets\lucky-balls.
  echo WHO'S LUCKY needs the 100 transparent numbered ball images.
  pause
  popd >nul
  exit /b 1
)

if not exist "feature-widget-assets\lucky-balls\lucky-ball-001.png" (
  echo Could not find lucky-ball-001.png.
  echo WHO'S LUCKY needs the complete lucky-balls image set.
  pause
  popd >nul
  exit /b 1
)

if not exist "feature-widget-assets\lucky-balls\lucky-ball-100.png" (
  echo Could not find lucky-ball-100.png.
  echo WHO'S LUCKY needs the complete lucky-balls image set.
  pause
  popd >nul
  exit /b 1
)

if not exist "game-assets" (
  echo Could not find the game-assets folder.
  pause
  popd >nul
  exit /b 1
)

if not exist "pdfjs" (
  echo Could not find the pdfjs folder.
  echo PDF upload rendering needs pdfjs\pdf.min.js and pdfjs\pdf.worker.min.js.
  pause
  popd >nul
  exit /b 1
)

if not exist "pdfjs\pdf.min.js" (
  echo Could not find pdfjs\pdf.min.js.
  echo PDF upload rendering needs the complete local PDF.js files.
  pause
  popd >nul
  exit /b 1
)

if not exist "pdfjs\pdf.worker.min.js" (
  echo Could not find pdfjs\pdf.worker.min.js.
  echo PDF upload rendering needs the complete local PDF.js files.
  pause
  popd >nul
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is required on this build computer.
  echo Install it from https://nodejs.org/ and run this file again.
  echo If you just installed Node.js, open a new Command Prompt or restart Windows first.
  pause
  popd >nul
  exit /b 1
)

for /f %%V in ('node -p "process.versions.node.split('.')[0]" 2^>nul') do set "NODE_MAJOR=%%V"
if "%NODE_MAJOR%"=="" (
  echo Could not read the installed Node.js version.
  echo Reinstall Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  popd >nul
  exit /b 1
)
if %NODE_MAJOR% LSS 18 (
  echo Node.js 18 or newer is required for the Windows FLOAT build tools.
  echo Your current Node.js major version is %NODE_MAJOR%.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  popd >nul
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found, even though Node.js may be installed.
  echo Reinstall Node.js LTS from https://nodejs.org/ and make sure npm is selected.
  echo If you just installed Node.js, open a new Command Prompt or restart Windows first.
  pause
  popd >nul
  exit /b 1
)

echo Preparing app files...
if exist "windows-float\app-files" rmdir /s /q "windows-float\app-files"
mkdir "windows-float\app-files"
mkdir "windows-float\app-files\assets"
mkdir "windows-float\app-files\feature-widget-assets"
mkdir "windows-float\app-files\game-assets"
mkdir "windows-float\app-files\pdfjs"

copy /y "teacher-dashboard-enhanced.html" "windows-float\app-files\teacher-dashboard-enhanced.html" >nul
xcopy /e /i /y "assets" "windows-float\app-files\assets" >nul
xcopy /e /i /y "feature-widget-assets" "windows-float\app-files\feature-widget-assets" >nul
xcopy /e /i /y "game-assets" "windows-float\app-files\game-assets" >nul
xcopy /e /i /y "pdfjs" "windows-float\app-files\pdfjs" >nul

if not exist "windows-float\app-files\teacher-dashboard-enhanced.html" (
  echo Failed to prepare the dashboard file for packaging.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\pdfjs\pdf.min.js" (
  echo Failed to copy pdfjs\pdf.min.js for packaging.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\pdfjs\pdf.worker.min.js" (
  echo Failed to copy pdfjs\pdf.worker.min.js for packaging.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\feature-widget-assets\lucky-balls\lucky-ball-100.png" (
  echo Failed to copy the WHO'S LUCKY numbered ball images for packaging.
  pause
  popd >nul
  exit /b 1
)

pushd "windows-float" >nul

set "NEED_INSTALL=0"
if not exist "node_modules\.bin\electron.cmd" set "NEED_INSTALL=1"
if not exist "node_modules\.bin\electron-builder.cmd" set "NEED_INSTALL=1"
if not exist "node_modules\electron\dist\electron.exe" set "NEED_INSTALL=1"

if "%NEED_INSTALL%"=="1" (
  echo Installing build dependencies. This only happens the first time.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo npm install failed. Check your internet connection, then try again.
    pause
    popd >nul
    popd >nul
    exit /b 1
  )
)

echo Building Teacher FLOAT.exe...
call npm run build:win
if errorlevel 1 (
  echo.
  echo Build failed.
  pause
  popd >nul
  popd >nul
  exit /b 1
)

popd >nul
if exist "windows-float\dist\Teacher FLOAT.exe" (
  copy /y "windows-float\dist\Teacher FLOAT.exe" "Teacher FLOAT.exe" >nul
  echo.
  echo Done. Your portable app is:
  echo %~dp0Teacher FLOAT.exe
) else (
  echo.
  echo Build finished, but Teacher FLOAT.exe was not found in windows-float\dist.
  pause
  popd >nul
  exit /b 1
)

pause
popd >nul

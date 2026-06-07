@echo off
setlocal

pushd "%~dp0" >nul

if not exist "teacher-dashboard-enhanced.html" if not exist "windows-float\app-files\teacher-dashboard-enhanced.html" (
  echo Could not find teacher-dashboard-enhanced.html in:
  echo %~dp0
  echo.
  echo Keep this launcher in the same folder as the dashboard HTML and asset folders.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\package.json" (
  echo Could not find the Windows FLOAT wrapper files.
  echo Expected: %~dp0windows-float\package.json
  pause
  popd >nul
  exit /b 1
)

if exist "teacher-dashboard-enhanced.html" (
  echo Syncing dashboard files for Windows FLOAT...
  if not exist "windows-float\app-files" mkdir "windows-float\app-files"
  copy /y "teacher-dashboard-enhanced.html" "windows-float\app-files\teacher-dashboard-enhanced.html" >nul
  if exist "manifest.webmanifest" copy /y "manifest.webmanifest" "windows-float\app-files\manifest.webmanifest" >nul

  if exist "assets" xcopy /e /i /y "assets" "windows-float\app-files\assets" >nul
  if exist "feature-widget-assets" xcopy /e /i /y "feature-widget-assets" "windows-float\app-files\feature-widget-assets" >nul
  if exist "game-assets" xcopy /e /i /y "game-assets" "windows-float\app-files\game-assets" >nul
  if exist "pdfjs" xcopy /e /i /y "pdfjs" "windows-float\app-files\pdfjs" >nul
  if exist "assets\teacher-float-launcher.png" copy /y "assets\teacher-float-launcher.png" "windows-float\launcher-logo.png" >nul
)

if not exist "windows-float\app-files\teacher-dashboard-enhanced.html" (
  echo Could not prepare the dashboard file for Windows FLOAT.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\pdfjs\pdf.min.js" (
  echo Could not find windows-float\app-files\pdfjs\pdf.min.js.
  echo PDF uploads need the local PDF.js files. Keep the pdfjs folder with this launcher.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\pdfjs\pdf.worker.min.js" (
  echo Could not find windows-float\app-files\pdfjs\pdf.worker.min.js.
  echo PDF uploads need the local PDF.js files. Keep the pdfjs folder with this launcher.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\feature-widget-assets\lucky-student-ships\lucky-student-001.png" (
  echo Could not find the WHO'S LUCKY student spaceship images.
  echo Keep feature-widget-assets\lucky-student-ships with this launcher.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\feature-widget-assets\lucky-student-ships\lucky-student-100.png" (
  echo Could not find the complete WHO'S LUCKY student spaceship image set.
  echo Keep feature-widget-assets\lucky-student-ships with this launcher.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\feature-widget-assets\lucky-point-ships\lucky-point-000.png" (
  echo Could not find the WHO'S LUCKY point spaceship images.
  echo Keep feature-widget-assets\lucky-point-ships with this launcher.
  pause
  popd >nul
  exit /b 1
)

if not exist "windows-float\app-files\feature-widget-assets\lucky-point-ships\lucky-point-100.png" (
  echo Could not find the complete WHO'S LUCKY point spaceship image set.
  echo Keep feature-widget-assets\lucky-point-ships with this launcher.
  pause
  popd >nul
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run Teacher FLOAT for Windows.
  echo Install the Windows LTS version from https://nodejs.org/
  echo Then open a new Command Prompt or restart Windows before trying again.
  pause
  popd >nul
  exit /b 1
)

for /f %%V in ('node -p "process.versions.node.split('.')[0]" 2^>nul') do set "NODE_MAJOR=%%V"
if "%NODE_MAJOR%"=="" (
  echo Could not read the installed Node.js version.
  echo Reinstall the Windows LTS version from https://nodejs.org/ and try again.
  pause
  popd >nul
  exit /b 1
)
if %NODE_MAJOR% LSS 18 (
  echo Node.js 18 or newer is required to run Teacher FLOAT for Windows.
  echo Your current Node.js major version is %NODE_MAJOR%.
  echo Install the Windows LTS version from https://nodejs.org/ and try again.
  pause
  popd >nul
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found, even though Node.js may be installed.
  echo Reinstall the Windows LTS version from https://nodejs.org/ and make sure npm is selected.
  echo Then open a new Command Prompt or restart Windows before trying again.
  pause
  popd >nul
  exit /b 1
)

pushd "windows-float" >nul

set "NEED_INSTALL=0"
if not exist "node_modules\.bin\electron.cmd" set "NEED_INSTALL=1"
if not exist "node_modules\electron\dist\electron.exe" set "NEED_INSTALL=1"

if "%NEED_INSTALL%"=="1" (
  echo Installing Windows FLOAT dependencies. This only happens the first time.
  if exist "package-lock.json" (
    call npm ci --no-audit --no-fund
  ) else (
    call npm install --no-audit --no-fund
  )
  if errorlevel 1 (
    echo.
    echo npm dependency installation failed. Check your internet connection, then try again.
    pause
    popd >nul
    popd >nul
    exit /b 1
  )
)

echo Starting Teacher FLOAT...
call npm start
if errorlevel 1 (
  echo.
  echo Teacher FLOAT did not start successfully. The error details are shown above.
  pause
  popd >nul
  popd >nul
  exit /b 1
)

popd >nul
popd >nul

@echo off
REM Serves this folder on http://localhost:8000 and opens it.
REM Needed because browsers block file:// fetches of the js/*.js lesson files.
cd /d "%~dp0"
start "" http://localhost:8000/
python -m http.server 8000
if errorlevel 1 (
  echo.
  echo Python not found. Alternatives:
  echo   npx serve .
  echo   php -S localhost:8000
  pause
)

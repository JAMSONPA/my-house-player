@echo off
title MY HOUSE
cd /d "%~dp0"
set "MYHOUSE_APP=%~dp0..\app"
if not exist "%MYHOUSE_APP%\index.html" set "MYHOUSE_APP=%~dp0..\02-app-tv-lg\app"
where node >nul 2>nul || (echo Node.js nao encontrado. Instale em https://nodejs.org e tente de novo. & pause & exit /b 1)
start "" /min cmd /c "node servidor-pc.js"
timeout /t 2 /nobreak >nul
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if defined CHROME (
  start "" "%CHROME%" --app=http://localhost:8787/ --start-fullscreen --user-data-dir="%LocalAppData%\MyHousePlayer"
) else (
  start "" msedge --app=http://localhost:8787/ --start-fullscreen
)
exit /b 0

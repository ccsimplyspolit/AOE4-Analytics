@echo off
title RTSLytics (automatic build + launch)
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\auto_build.ps1" -Launch
if errorlevel 1 (
  echo.
  echo *** AUTOMATIC BUILD FAILED - see the output above. ***
  pause
  exit /b 1
)

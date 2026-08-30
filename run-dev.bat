@echo off
rem Fast launcher: electron-vite dev server + hot reload. Dependencies are
rem installed automatically by the full build script when needed.
title RTSLytics (dev launch)
cd /d "%~dp0"
echo Launching RTSLytics development mode (hot reload)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_elevated.ps1" -Mode dev

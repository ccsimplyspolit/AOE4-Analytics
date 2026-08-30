@echo off
cd /d "%~dp0"
title RTSLytics
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_elevated.ps1" -Mode dev

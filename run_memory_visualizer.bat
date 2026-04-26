@echo off
echo ===============================
echo Starting Memory Visualizer App
echo ===============================

REM Move to project root
cd /d "%~dp0memory-visualizer"

echo.
echo Installing dependencies (first time only may take time)...
call npm install

echo.
echo Running Vite dev server...
call npm run dev

pause
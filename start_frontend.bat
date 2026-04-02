@echo off
echo Starting HOLO AstroCRM Frontend on http://localhost:3000
cd /d %~dp0\frontend
npm run dev
pause

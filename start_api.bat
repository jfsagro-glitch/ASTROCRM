@echo off
echo Starting HOLO Astrology API on http://localhost:8000
cd /d %~dp0
python -m uvicorn astro_api:app --reload --host 0.0.0.0 --port 8000
pause

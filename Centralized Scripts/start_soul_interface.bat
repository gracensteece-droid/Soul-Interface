@echo off
title Soul Interface — Starting Servers

echo.
echo  SOUL INTERFACE
echo  Starting all servers...
echo.

:: Maren — Tropical Astrology — port 8000
start "Maren :8000" cmd /k "cd /d "%~dp0..\Maren\Backend\Code" && doppler run -- py -3.11 -m uvicorn maren:app --reload --port 8000"

:: Arya — Vedic Jyotish — port 8001
start "Arya :8001" cmd /k "cd /d "%~dp0..\Arya\Backend\Code" && doppler run -- py -3.11 -m uvicorn arya:app --reload --port 8001"

:: Aion — Cosmogenesis — port 8002
start "Aion :8002" cmd /k "cd /d "%~dp0..\Aion\Backend\Code" && doppler run -- py -3.11 -m uvicorn Aion:app --reload --port 8002"

:: Frontend server — port 3000
start "Soul Interface :3000" cmd /k "cd /d "%~dp0.." && py -3.11 -m http.server 3000"

:: Wait for servers to start then open browser
timeout /t 4 /nobreak > nul
start "" "http://localhost:3000/index.html"

echo.
echo  All servers started.
echo  Opening http://localhost:3000/index.html
echo.

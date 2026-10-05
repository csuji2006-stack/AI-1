@echo off
setlocal
cd /d "%~dp0backend"

python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Flask is not installed. Install the backend requirements first:
    echo   python -m pip install -r requirements.txt
    pause
    exit /b 1
)

python app.py
pause

@echo off
echo 🚀 Starting Resume Analysis System...

REM Check if Python virtual environment exists
if not exist "backend\venv" (
    echo 📦 Setting up Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    python -m spacy download en_core_web_sm
    cd ..
)

REM Check if Node modules exist
if not exist "node_modules" (
    echo 📦 Installing Node.js dependencies...
    npm install
)

echo 🐍 Starting Python backend...
cd backend
call venv\Scripts\activate
start /b python app.py
cd ..

echo ⚛️ Starting React frontend...
start /b npm run dev

echo ✅ Both servers are starting...
echo 📊 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:5000
echo.
echo Press any key to stop both servers...
pause >nul

echo 🛑 Stopping servers...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1 
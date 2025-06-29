#!/bin/bash

echo "🚀 Starting Resume Analysis System..."

# Check if Python virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Setting up Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python -m spacy download en_core_web_sm
    cd ..
fi

# Check if Node modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo "🐍 Starting Python backend..."
cd backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!
cd ..

echo "⚛️ Starting React frontend..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Both servers are starting..."
echo "📊 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup background processes
cleanup() {
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user interrupt
wait 
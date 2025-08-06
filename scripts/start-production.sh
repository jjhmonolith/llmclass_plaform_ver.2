#!/bin/bash
set -e

echo "🚀 Starting LLM Classroom Platform in Production Mode..."

# Wait for system to be ready
sleep 5

# Create necessary directories
mkdir -p /app/data /app/logs

# Set environment variables
export PATH="/home/app/.local/bin:$PATH"
export PYTHONPATH="/app:$PYTHONPATH"

# Initialize database if needed
echo "📊 Initializing database..."
cd /app
python -c "
from app.core.database import Base, engine
Base.metadata.create_all(bind=engine)
print('Database initialized successfully')
"

# Seed initial data
echo "🌱 Seeding initial data..."
python app/seed_modes.py

# Start Proto4 backend in background
echo "🧠 Starting Proto4 Backend (Port 3001)..."
cd /app/proto4
python -m uvicorn main:app --host 0.0.0.0 --port 3001 --env-file ../.env.production &
PROTO4_PID=$!

# Wait for Proto4 to start
sleep 10

# Start main platform backend
echo "🏫 Starting Platform Backend (Port 3000)..."
cd /app
python -m uvicorn app.main:app --host 0.0.0.0 --port 3000 --env-file .env.production &
PLATFORM_PID=$!

# Function to handle shutdown
shutdown() {
    echo "🛑 Shutting down services..."
    kill $PROTO4_PID $PLATFORM_PID 2>/dev/null || true
    wait
    exit 0
}

# Set up signal handlers
trap shutdown SIGTERM SIGINT

# Keep the script running
echo "✅ All services started successfully!"
echo "📊 Platform Backend: http://localhost:3000"
echo "🧠 Proto4 Backend: http://localhost:3001"
echo "📝 Logs are being written to /app/logs/"

wait
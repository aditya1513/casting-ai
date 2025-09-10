#!/bin/bash

# Start the Python AI Service

echo "🚀 Starting CastMatch Python AI Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Download spaCy model if not present
echo "📚 Checking NLP models..."
python -m spacy download en_core_web_sm 2>/dev/null || echo "SpaCy model already installed"

# Export environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Check Redis connection
echo "🔍 Checking Redis..."
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Redis is not running. Memory features will be limited."
    echo "   Start Redis with: redis-server"
else
    echo "✅ Redis is running"
fi

# Check PostgreSQL connection
echo "🔍 Checking PostgreSQL..."
python -c "
import asyncpg
import asyncio
import os

async def check_db():
    try:
        conn = await asyncpg.connect(os.getenv('DATABASE_URL', 'postgresql://Aditya@localhost:5432/castmatch_db'))
        await conn.close()
        print('✅ PostgreSQL is running')
        return True
    except Exception as e:
        print(f'⚠️  Warning: PostgreSQL connection failed: {e}')
        print('   Database features will be limited.')
        return False

asyncio.run(check_db())
" 2>/dev/null

# Start the service
echo ""
echo "🎯 Starting FastAPI server..."
echo "📍 API Documentation: http://localhost:8000/docs"
echo "📍 Health Check: http://localhost:8000/health"
echo ""

# Run with auto-reload for development
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level info
#!/bin/bash

# Restart Server with Memory Leak Fixes
# This script safely restarts the backend server with memory optimizations

echo "🔧 Restarting CastMatch Backend with Memory Leak Fixes..."

# Kill any existing Node processes for this project
echo "📱 Stopping existing server processes..."
pkill -f "node.*src/server.ts" || true
pkill -f "ts-node.*src/server.ts" || true
pkill -f "nodemon.*src/server.ts" || true

# Wait for processes to fully terminate
sleep 3

# Check if any processes are still running
REMAINING_PROCESSES=$(pgrep -f "node.*src/server" | wc -l)
if [ $REMAINING_PROCESSES -gt 0 ]; then
    echo "⚠️  Force killing remaining processes..."
    pkill -9 -f "node.*src/server" || true
    sleep 2
fi

# Clean up any leftover temporary files
echo "🧹 Cleaning up temporary files..."
rm -rf /tmp/castmatch-*
rm -rf .tmp/

# Set memory optimization environment variables
export NODE_OPTIONS="--max-old-space-size=512 --expose-gc"
export ENABLE_MEMORY_MONITORING="true"
export NODE_ENV="development"

# Create logs directory if it doesn't exist
mkdir -p logs

echo "🚀 Starting server with memory optimizations..."
echo "   - Max heap size: 512MB"
echo "   - Garbage collection exposed"
echo "   - Memory monitoring enabled"
echo ""

# Start the server with memory monitoring
if command -v nodemon &> /dev/null; then
    echo "📝 Using nodemon for development..."
    nodemon --exec "node --max-old-space-size=512 --expose-gc -r ts-node/register src/server.ts" \
        --watch "src/**/*" \
        --ext "ts,js,json" \
        --ignore "node_modules/" \
        --ignore "dist/" \
        --ignore "logs/" \
        --delay 2 \
        --verbose \
        2>&1 | tee logs/server-$(date +%Y%m%d-%H%M%S).log
else
    echo "📝 Using ts-node directly..."
    node --max-old-space-size=512 --expose-gc -r ts-node/register src/server.ts \
        2>&1 | tee logs/server-$(date +%Y%m%d-%H%M%S).log
fi

echo "✅ Server startup script completed."
#!/bin/bash

echo "🧹 Cleaning up resource-intensive processes..."

# Kill any lingering test servers
pkill -f "playwright.*test-server" 2>/dev/null

# Kill monitoring processes
pkill -f "monitoring|dashboard|orchestrator" 2>/dev/null

# Clear Node memory cache
npm cache clean --force 2>/dev/null

# Kill any stuck Node processes older than 1 hour
ps aux | grep node | grep -v grep | awk '{print $2, $9}' | while read pid time; do
    if [[ "$time" > "1:00.00" ]]; then
        kill $pid 2>/dev/null
    fi
done

echo "✅ Cleanup complete"
echo "💡 To prevent crashes:"
echo "   - Don't run 'npm run monitor' for extended periods"
echo "   - Close chat UI tabs when not in use"
echo "   - Run this script if system feels sluggish"
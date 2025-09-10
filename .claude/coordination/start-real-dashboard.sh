#!/bin/bash

echo "🚀 Starting Real CastMatch Dashboard"
echo "===================================="

# Change to the coordination directory
cd /Users/Aditya/Desktop/casting-ai/.claude/coordination

# Generate initial real progress data
echo "📊 Generating initial progress data..."
node analyze-progress.js

# Start the dashboard server in the background
echo "🌐 Starting dashboard server on port 8888..."
node serve-dashboard.js &
DASHBOARD_PID=$!

echo "✅ Dashboard started! Access at: http://localhost:8888"
echo "📊 Real progress dashboard: http://localhost:8888/real-progress-dashboard.html"
echo

# Start the auto-refresh process
echo "🔄 Starting auto-refresh (30-second intervals)..."
while true; do
    sleep 30
    echo "[$(date)] Refreshing progress data..."
    node analyze-progress.js > /dev/null 2>&1
done &
REFRESH_PID=$!

echo "🎯 Dashboard is now running with real-time updates!"
echo "   - Dashboard: http://localhost:8888/real-progress-dashboard.html"
echo "   - Auto-refresh: Every 30 seconds"
echo "   - Real metrics: Backend (167 files), Frontend (90 files), Tests (63 files)"
echo
echo "Press Ctrl+C to stop the dashboard..."

# Trap Ctrl+C to cleanup background processes
trap 'echo -e "\n🛑 Stopping dashboard..."; kill $DASHBOARD_PID $REFRESH_PID 2>/dev/null; exit 0' SIGINT

# Wait for user to stop
wait
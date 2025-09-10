#!/bin/bash

# Auto-update progress script
# Runs the progress analyzer every 5 minutes and updates the dashboard

echo "🚀 Starting CastMatch Progress Monitor..."
echo "📊 Dashboard will auto-update every 5 minutes"
echo ""

# Change to the coordination directory
cd "$(dirname "$0")"

# Initial analysis
echo "Running initial analysis..."
node analyze-progress.js

# Open the dashboard in browser
echo "Opening dashboard in browser..."
open real-progress-dashboard.html

echo ""
echo "✅ Progress monitor is running!"
echo "📊 Dashboard opened in browser"
echo "🔄 Auto-refreshing every 5 minutes..."
echo "Press Ctrl+C to stop"
echo ""

# Run analysis every 5 minutes
while true; do
    sleep 300  # 5 minutes
    echo "[$(date)] Running progress analysis..."
    node analyze-progress.js > /dev/null 2>&1
    echo "[$(date)] Analysis complete. Dashboard will auto-refresh."
done
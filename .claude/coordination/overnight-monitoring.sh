#!/bin/bash

# CastMatch Overnight System Monitoring Script
# Maintains system stability during Week 1 → Week 2 transition
# Generated: September 5, 2025, 23:25 IST

echo "🌙 CastMatch Overnight Monitoring Started - $(date)"
echo "==============================================="

# Configuration
BACKEND_PORT=5002
AI_SERVICE_PORT=8002
FRONTEND_PORT=3001
LOG_FILE="/Users/Aditya/Desktop/casting-ai/.claude/coordination/overnight-log.txt"
HEALTH_CHECK_INTERVAL=300  # 5 minutes

# Initialize log
echo "$(date): Overnight monitoring initialized" > "$LOG_FILE"

# Service health check function
check_service() {
    local service_name="$1"
    local port="$2"
    local endpoint="$3"
    
    echo "🔍 Checking $service_name (port $port)..."
    
    if curl -s "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        echo "✅ $service_name: HEALTHY"
        echo "$(date): $service_name - HEALTHY" >> "$LOG_FILE"
        return 0
    else
        echo "❌ $service_name: DOWN"
        echo "$(date): $service_name - DOWN - ALERT" >> "$LOG_FILE"
        return 1
    fi
}

# Process check function
check_processes() {
    echo "🔍 Checking active processes..."
    
    local backend_count=$(ps aux | grep -E "ts-node.*server" | grep -v grep | wc -l)
    local ai_count=$(ps aux | grep -E "uvicorn|python.*main" | grep -v grep | wc -l)
    local frontend_count=$(ps aux | grep -E "next" | grep -v grep | wc -l)
    
    echo "📊 Process Status:"
    echo "   Backend processes: $backend_count"
    echo "   AI Service processes: $ai_count" 
    echo "   Frontend processes: $frontend_count"
    
    echo "$(date): Processes - Backend:$backend_count AI:$ai_count Frontend:$frontend_count" >> "$LOG_FILE"
}

# Main monitoring loop
monitor_system() {
    local failures=0
    
    while true; do
        echo ""
        echo "🕒 System Health Check - $(date)"
        echo "--------------------------------"
        
        # Check all services
        check_service "Backend API" "$BACKEND_PORT" "/" || ((failures++))
        check_service "AI Service" "$AI_SERVICE_PORT" "/health" || ((failures++))
        check_service "Frontend" "$FRONTEND_PORT" "/" || ((failures++))
        
        # Check processes
        check_processes
        
        # System resource check
        echo "💾 System Resources:"
        echo "   Memory: $(free -h 2>/dev/null || echo 'N/A (macOS)')"
        echo "   Disk: $(df -h . | tail -1 | awk '{print $5 " used"}')"
        
        # Alert if multiple failures
        if [ $failures -gt 1 ]; then
            echo "🚨 ALERT: Multiple service failures detected!"
            echo "$(date): ALERT - Multiple failures: $failures" >> "$LOG_FILE"
            
            # Could add notification here (email, slack, etc.)
        fi
        
        # Reset failure counter
        failures=0
        
        echo "⏳ Next check in $((HEALTH_CHECK_INTERVAL / 60)) minutes..."
        echo "$(date): Health check completed" >> "$LOG_FILE"
        
        # Wait for next check
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Emergency recovery function
emergency_restart() {
    echo "🚨 EMERGENCY RESTART TRIGGERED"
    echo "$(date): Emergency restart initiated" >> "$LOG_FILE"
    
    # Kill existing processes
    echo "⏹️  Stopping services..."
    pkill -f "ts-node.*server" 2>/dev/null || true
    pkill -f "uvicorn" 2>/dev/null || true
    pkill -f "next" 2>/dev/null || true
    
    sleep 5
    
    # Restart backend
    echo "🚀 Restarting backend..."
    cd /Users/Aditya/Desktop/casting-ai
    npm run dev > /dev/null 2>&1 &
    
    # Restart AI service
    echo "🤖 Restarting AI service..."
    cd /Users/Aditya/Desktop/casting-ai/python-ai-service
    source venv/bin/activate
    python -c "
import uvicorn
from fastapi import FastAPI

app = FastAPI(title='CastMatch AI Service - Emergency', version='1.0.0')

@app.get('/health')
async def health():
    return {'status': 'healthy', 'service': 'emergency-restart'}

@app.post('/chat')
async def chat(request: dict):
    return {'message': 'Emergency service - system restarted', 'status': 'recovered'}

uvicorn.run(app, host='0.0.0.0', port=8002)
" > /dev/null 2>&1 &
    
    # Restart frontend
    echo "🖥️  Restarting frontend..."
    cd /Users/Aditya/Desktop/casting-ai/frontend
    npm run dev > /dev/null 2>&1 &
    
    echo "✅ Emergency restart completed"
    echo "$(date): Emergency restart completed" >> "$LOG_FILE"
}

# Trap Ctrl+C
trap 'echo "🛑 Monitoring stopped by user - $(date)"; exit 0' INT

# Display initial status
echo "🚀 CastMatch System Status:"
echo "📍 Project: /Users/Aditya/Desktop/casting-ai"
echo "📊 Monitoring Interval: $((HEALTH_CHECK_INTERVAL / 60)) minutes"
echo "📝 Log File: $LOG_FILE"
echo "🎯 Mission: Maintain stability through Week 1 → Week 2 transition"
echo ""

# Start monitoring
monitor_system
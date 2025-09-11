#!/bin/bash

# CastMatch Agent Monitoring Script - Auto-refresh every 2 minutes

DASHBOARD_FILE="monitoring-dashboard.md"
REFRESH_INTERVAL=120 # 2 minutes in seconds

echo "🔄 Starting CastMatch Agent Monitoring System..."
echo "Dashboard will refresh every 2 minutes"
echo "Press Ctrl+C to stop monitoring"
echo ""

while true; do
    clear
    echo "=========================================="
    echo "🔴 LIVE AGENT MONITORING - $(date '+%I:%M %p %Z')"
    echo "=========================================="
    
    # Check git activity
    echo -e "\n📊 Recent Git Activity:"
    git log --oneline -5 --pretty=format:"  %h - %ar: %s" 2>/dev/null || echo "  No git repository found"
    
    # Check modified files in last 5 minutes
    echo -e "\n\n📁 Files Modified (Last 5 min):"
    find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -mmin -5 2>/dev/null | head -10 | sed 's/^/  /'
    
    # Check running processes
    echo -e "\n\n⚙️  Active Processes:"
    ps aux | grep -E '(node|npm|docker|postgres)' | grep -v grep | head -5 | awk '{printf "  %-20s %s%%\n", $11, $3}'
    
    # Check Docker containers
    echo -e "\n\n🐳 Docker Status:"
    docker ps --format "  {{.Names}}: {{.Status}}" 2>/dev/null || echo "  Docker not running"
    
    # Memory and CPU
    echo -e "\n\n💻 System Resources:"
    echo "  CPU: $(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')% usage"
    echo "  Memory: $(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')"
    
    # Port usage
    echo -e "\n\n🔌 Active Ports:"
    lsof -i -P | grep LISTEN | grep -E '(3000|5432|8080|4000)' | head -5 | awk '{printf "  Port %s: %s\n", $9, $1}' 2>/dev/null || echo "  No development ports active"
    
    # Display countdown
    echo -e "\n\n⏱️  Next refresh in: "
    for ((i=$REFRESH_INTERVAL; i>0; i--)); do
        printf "\r⏱️  Next refresh in: %02d:%02d" $((i/60)) $((i%60))
        sleep 1
    done
done
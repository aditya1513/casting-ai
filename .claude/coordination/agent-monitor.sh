#!/bin/bash

# CastMatch Agent Monitoring System v2.0
# Automated progress tracking and coordination
# Runs every 2 hours to check agent status

set -e

# Configuration
COORDINATION_DIR="/Users/Aditya/Desktop/casting-ai/.claude/coordination"
PROJECT_DIR="/Users/Aditya/Desktop/casting-ai"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
STATUS_FILE="$COORDINATION_DIR/agent-status-${TIMESTAMP}.json"
ALERT_FILE="$COORDINATION_DIR/alerts-${TIMESTAMP}.md"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CastMatch Agent Monitoring System${NC}"
echo -e "${BLUE}Timestamp: ${TIMESTAMP}${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to check service health
check_service_health() {
    echo -e "${GREEN}Checking service health...${NC}"
    
    # Check PostgreSQL
    if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo "✅ PostgreSQL: Operational"
        POSTGRES_STATUS="operational"
    else
        echo "❌ PostgreSQL: Down"
        POSTGRES_STATUS="down"
    fi
    
    # Check Redis
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis: Operational"
        REDIS_STATUS="operational"
    else
        echo "❌ Redis: Down (Authentication issues)"
        REDIS_STATUS="down"
    fi
    
    # Check Node.js backend
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend API: Operational"
        BACKEND_STATUS="operational"
    else
        echo "⚠️ Backend API: Not responding"
        BACKEND_STATUS="down"
    fi
    
    # Check Next.js frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend: Operational"
        FRONTEND_STATUS="operational"
    else
        echo "⚠️ Frontend: Not running"
        FRONTEND_STATUS="down"
    fi
    
    echo ""
}

# Function to analyze code changes
analyze_code_progress() {
    echo -e "${GREEN}Analyzing code progress...${NC}"
    
    cd "$PROJECT_DIR"
    
    # Count files by category
    BACKEND_FILES=$(find src -name "*.ts" -o -name "*.js" 2>/dev/null | wc -l)
    FRONTEND_FILES=$(find frontend -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l)
    TEST_FILES=$(find tests -name "*.spec.ts" -o -name "*.test.ts" 2>/dev/null | wc -l)
    
    echo "📊 Code Statistics:"
    echo "  Backend files: $BACKEND_FILES"
    echo "  Frontend files: $FRONTEND_FILES"
    echo "  Test files: $TEST_FILES"
    
    # Check for recent commits
    RECENT_COMMITS=$(git log --oneline --since="2 hours ago" 2>/dev/null | wc -l)
    echo "  Recent commits (last 2 hours): $RECENT_COMMITS"
    
    echo ""
}

# Function to check agent task completion
check_agent_tasks() {
    echo -e "${GREEN}Checking agent task completion...${NC}"
    
    # Define critical files to check
    declare -A CRITICAL_FILES=(
        ["Backend API - Claude Service"]="src/services/claude/conversation.service.ts"
        ["Backend API - Memory Service"]="src/services/memory/short-term-memory.service.ts"
        ["AI/ML - Python Service"]="python-ai-service/app/services/claude_service.py"
        ["Frontend - Chat Page"]="frontend/app/chat/page.tsx"
        ["DevOps - Docker Compose"]="docker-compose.yml"
    )
    
    for task in "${!CRITICAL_FILES[@]}"; do
        file="${CRITICAL_FILES[$task]}"
        if [ -f "$PROJECT_DIR/$file" ]; then
            echo "✅ $task: File exists"
        else
            echo "❌ $task: File missing - $file"
        fi
    done
    
    echo ""
}

# Function to identify blockers
identify_blockers() {
    echo -e "${YELLOW}Identifying blockers...${NC}"
    
    BLOCKERS=()
    
    if [ "$REDIS_STATUS" = "down" ]; then
        BLOCKERS+=("🔴 CRITICAL: Redis not operational - blocking memory system")
    fi
    
    if [ "$POSTGRES_STATUS" = "down" ]; then
        BLOCKERS+=("🔴 CRITICAL: PostgreSQL down - blocking all database operations")
    fi
    
    if [ "$BACKEND_STATUS" = "down" ] && [ "$REDIS_STATUS" = "operational" ]; then
        BLOCKERS+=("⚠️ Backend API not running - frontend blocked")
    fi
    
    # Check if Anthropic API key exists
    if ! grep -q "ANTHROPIC_API_KEY" "$PROJECT_DIR/.env" 2>/dev/null; then
        BLOCKERS+=("⚠️ Anthropic API key not configured")
    fi
    
    if [ ${#BLOCKERS[@]} -eq 0 ]; then
        echo "✅ No critical blockers identified"
    else
        for blocker in "${BLOCKERS[@]}"; do
            echo "$blocker"
        done
    fi
    
    echo ""
}

# Function to generate status report
generate_status_json() {
    echo -e "${GREEN}Generating status report...${NC}"
    
    cat > "$STATUS_FILE" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "services": {
    "postgresql": "${POSTGRES_STATUS}",
    "redis": "${REDIS_STATUS}",
    "backend": "${BACKEND_STATUS}",
    "frontend": "${FRONTEND_STATUS}"
  },
  "code_metrics": {
    "backend_files": ${BACKEND_FILES},
    "frontend_files": ${FRONTEND_FILES},
    "test_files": ${TEST_FILES},
    "recent_commits": ${RECENT_COMMITS}
  },
  "agents": {
    "devops": {
      "status": "$([ "$REDIS_STATUS" = "operational" ] && echo "active" || echo "blocked")",
      "current_task": "Redis configuration fixes",
      "progress": $([ "$REDIS_STATUS" = "operational" ] && echo "90" || echo "60")
    },
    "backend": {
      "status": "$([ -f "$PROJECT_DIR/src/services/claude/conversation.service.ts" ] && echo "active" || echo "pending")",
      "current_task": "Claude API integration",
      "progress": $([ -f "$PROJECT_DIR/src/services/claude/conversation.service.ts" ] && echo "70" || echo "30")
    },
    "ai_ml": {
      "status": "$([ "$REDIS_STATUS" = "operational" ] && echo "active" || echo "blocked")",
      "current_task": "Memory system design",
      "progress": 40
    },
    "frontend": {
      "status": "$([ "$BACKEND_STATUS" = "operational" ] && echo "active" || echo "waiting")",
      "current_task": "Chat UI optimization",
      "progress": 60
    }
  }
}
EOF
    
    echo "✅ Status report saved to: $STATUS_FILE"
    echo ""
}

# Function to generate alerts
generate_alerts() {
    echo -e "${GREEN}Generating alerts...${NC}"
    
    cat > "$ALERT_FILE" <<EOF
# CastMatch Agent Monitoring Alert
**Generated**: ${TIMESTAMP}

## Service Status
- PostgreSQL: ${POSTGRES_STATUS}
- Redis: ${REDIS_STATUS}
- Backend API: ${BACKEND_STATUS}
- Frontend: ${FRONTEND_STATUS}

## Critical Alerts
EOF
    
    if [ ${#BLOCKERS[@]} -gt 0 ]; then
        echo "### 🚨 Blockers Detected" >> "$ALERT_FILE"
        for blocker in "${BLOCKERS[@]}"; do
            echo "- $blocker" >> "$ALERT_FILE"
        done
    else
        echo "### ✅ No Critical Issues" >> "$ALERT_FILE"
    fi
    
    cat >> "$ALERT_FILE" <<EOF

## Recommended Actions
EOF
    
    if [ "$REDIS_STATUS" = "down" ]; then
        cat >> "$ALERT_FILE" <<EOF
1. **Fix Redis Connection**:
   \`\`\`bash
   docker-compose down redis
   docker-compose up -d redis
   redis-cli ping
   \`\`\`
EOF
    fi
    
    if [ "$BACKEND_STATUS" = "down" ] && [ "$REDIS_STATUS" = "operational" ]; then
        cat >> "$ALERT_FILE" <<EOF
2. **Start Backend Server**:
   \`\`\`bash
   cd $PROJECT_DIR
   npm run dev
   \`\`\`
EOF
    fi
    
    echo "✅ Alert report saved to: $ALERT_FILE"
    echo ""
}

# Function to check dependency chain
check_dependencies() {
    echo -e "${GREEN}Checking dependency chains...${NC}"
    
    echo "📋 Dependency Status:"
    
    # Infrastructure → Backend
    if [ "$REDIS_STATUS" = "operational" ] && [ "$POSTGRES_STATUS" = "operational" ]; then
        echo "✅ Infrastructure → Backend: READY"
    else
        echo "❌ Infrastructure → Backend: BLOCKED"
    fi
    
    # Backend → Frontend
    if [ "$BACKEND_STATUS" = "operational" ]; then
        echo "✅ Backend → Frontend: READY"
    else
        echo "❌ Backend → Frontend: BLOCKED"
    fi
    
    # Backend → AI/ML
    if [ "$REDIS_STATUS" = "operational" ]; then
        echo "✅ Backend → AI/ML: READY"
    else
        echo "❌ Backend → AI/ML: BLOCKED"
    fi
    
    echo ""
}

# Function to send notifications
send_notifications() {
    echo -e "${GREEN}Sending notifications...${NC}"
    
    # Check if there are critical blockers
    if [ ${#BLOCKERS[@]} -gt 0 ]; then
        echo "⚠️ Critical issues detected - notifications would be sent to:"
        echo "  - DevOps team (Redis/Infrastructure issues)"
        echo "  - Backend team (API dependencies)"
        echo "  - Orchestrator (escalation required)"
    else
        echo "✅ All systems operational - no alerts needed"
    fi
    
    echo ""
}

# Main execution
main() {
    check_service_health
    analyze_code_progress
    check_agent_tasks
    identify_blockers
    check_dependencies
    generate_status_json
    generate_alerts
    send_notifications
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Monitoring Complete${NC}"
    echo -e "${BLUE}Next check in 2 hours${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Run main function
main

# Schedule next run (if running as cron)
# */120 * * * * /Users/Aditya/Desktop/casting-ai/.claude/coordination/agent-monitor.sh
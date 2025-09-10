#!/bin/bash

# CastMatch Backend with AI Agents Startup Script
# Starts both the backend server and the agents server concurrently

echo "🚀 Starting CastMatch Backend with AI Agents..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set trap for cleanup
trap cleanup INT TERM

# Check if agents server exists
AGENTS_DIR="/Users/Aditya/Desktop/casting-ai/agents"
if [ ! -d "$AGENTS_DIR" ]; then
    echo -e "${RED}Error: Agents directory not found at $AGENTS_DIR${NC}"
    exit 1
fi

# Check if backend directory exists
BACKEND_DIR="/Users/Aditya/Desktop/casting-ai/apps/backend"
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

# Start Agents Server
echo -e "${BLUE}Starting AI Agents Server on port 8080...${NC}"
cd "$AGENTS_DIR"
if [ -f "start.js" ]; then
    node start.js &
    AGENTS_PID=$!
    echo -e "${GREEN}✓ Agents server started (PID: $AGENTS_PID)${NC}"
else
    echo -e "${RED}Error: start.js not found in agents directory${NC}"
    exit 1
fi

# Wait a bit for agents server to initialize
sleep 3

# Start Backend Server
echo -e "${BLUE}Starting Backend Server...${NC}"
cd "$BACKEND_DIR"
bun --watch src/server-hono.ts &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"

# Display status
echo -e "\n${GREEN}==================================${NC}"
echo -e "${GREEN}Services Running:${NC}"
echo -e "${GREEN}==================================${NC}"
echo -e "📡 AI Agents Server: ${BLUE}http://localhost:8080${NC}"
echo -e "   - Health: http://localhost:8080/health"
echo -e "   - Status: http://localhost:8080/api/agents/status"
echo -e "   - Demo: http://localhost:8080/api/demo/complete-workflow"
echo -e ""
echo -e "🖥️  Backend Server: ${BLUE}http://localhost:3001${NC}"
echo -e "   - tRPC Panel: http://localhost:3001/trpc-panel"
echo -e "   - Health: http://localhost:3001/api/trpc/health.check"
echo -e "${GREEN}==================================${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for processes
wait
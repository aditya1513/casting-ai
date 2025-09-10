#!/bin/bash

# CastMatch Development Startup Script
# Runs both backend and frontend with Bun

set -e

echo "🐉 CastMatch Development Environment"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Bun is installed
if ! command -v ~/.bun/bin/bun &> /dev/null; then
    echo -e "${RED}❌ Bun not found. Install it from https://bun.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Bun found: $(~/.bun/bin/bun --version)${NC}"

# Check if Dragonfly is running
echo -e "${YELLOW}🔧 Checking Dragonfly status...${NC}"
if docker exec castmatch-dragonfly redis-cli -a castmatch_redis_password ping &> /dev/null; then
    echo -e "${GREEN}✅ Dragonfly is running${NC}"
else
    echo -e "${YELLOW}⚠️  Starting Docker services...${NC}"
    docker-compose up -d dragonfly postgres qdrant
    sleep 3
    if docker exec castmatch-dragonfly redis-cli -a castmatch_redis_password ping &> /dev/null; then
        echo -e "${GREEN}✅ Dragonfly started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start Dragonfly${NC}"
        exit 1
    fi
fi

# Create log directory
mkdir -p logs

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down development servers...${NC}"
    jobs -p | xargs -r kill
    wait
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

echo -e "\n${BLUE}🚀 Starting backend server...${NC}"
cd "$(dirname "$0")"
~/.bun/bin/bun run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${MAGENTA}🚀 Starting frontend server...${NC}"
cd frontend
~/.bun/bin/bun run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

cd ..

# Wait for servers to start
echo -e "${YELLOW}⏳ Waiting for servers to start...${NC}"
sleep 5

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Backend server started (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Backend server failed to start${NC}"
    echo -e "${YELLOW}Backend log:${NC}"
    tail -n 10 logs/backend.log
fi

# Check if frontend is running
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Frontend server started (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}❌ Frontend server failed to start${NC}"
    echo -e "${YELLOW}Frontend log:${NC}"
    tail -n 10 logs/frontend.log
fi

echo -e "\n${CYAN}🎉 Development environment is ready!${NC}"
echo -e "${CYAN}=================================${NC}"
echo -e "📊 Services:"
echo -e "   ${BLUE}• Backend:${NC}  http://localhost:8000"
echo -e "   ${MAGENTA}• Frontend:${NC} http://localhost:3000"
echo -e "   ${CYAN}• API Docs:${NC} http://localhost:8000/api"
echo -e "   ${GREEN}• Health:${NC}   http://localhost:8000/api/health"

echo -e "\n📱 Quick Commands:"
echo -e "   ${YELLOW}• View logs:${NC}     tail -f logs/backend.log logs/frontend.log"
echo -e "   ${YELLOW}• Test API:${NC}      curl http://localhost:8000/api/health"
echo -e "   ${YELLOW}• Test Dragonfly:${NC} docker exec castmatch-dragonfly redis-cli -a castmatch_redis_password ping"

echo -e "\n${YELLOW}💡 Press Ctrl+C to stop all services${NC}"

# Keep script running and show live status
while true; do
    sleep 30
    
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}⚠️  Backend process died, restarting...${NC}"
        ~/.bun/bin/bun run dev > logs/backend.log 2>&1 &
        BACKEND_PID=$!
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}⚠️  Frontend process died, restarting...${NC}"
        cd frontend
        ~/.bun/bin/bun run dev > ../logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd ..
    fi
done
#!/bin/bash

# CastMatch - Complete Stack Startup Script
# Starts all services in the correct order with health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
STARTUP_LOG="$LOG_DIR/startup-$(date +%Y%m%d-%H%M%S).log"

# Create log directory
mkdir -p "$LOG_DIR"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$STARTUP_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$STARTUP_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$STARTUP_LOG"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 is not installed"
        exit 1
    fi
}

wait_for_service() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=0

    log "Waiting for $service_name to be ready..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f -o /dev/null "$health_url" 2>/dev/null; then
            log "✅ $service_name is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    error "$service_name failed to start"
    return 1
}

cleanup() {
    warning "Shutting down services..."
    
    # Stop Docker Compose services
    cd "$PROJECT_ROOT"
    docker-compose down
    
    # Kill any remaining Node processes
    pkill -f "node.*castmatch" || true
    pkill -f "npm.*castmatch" || true
    
    log "Cleanup completed"
}

# Trap for cleanup on exit
trap cleanup EXIT INT TERM

# Main execution
main() {
    log "Starting CastMatch Complete Stack"
    log "Project root: $PROJECT_ROOT"
    log "Log file: $STARTUP_LOG"
    
    # Check prerequisites
    log "Checking prerequisites..."
    check_command docker
    check_command docker-compose
    check_command node
    check_command npm
    
    # Check Docker daemon
    if ! docker info > /dev/null 2>&1; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Load environment variables
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log "Loading environment variables from .env"
        export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
    else
        warning ".env file not found, using defaults"
    fi
    
    # Step 1: Start infrastructure services (PostgreSQL, Redis)
    log "Starting infrastructure services..."
    cd "$PROJECT_ROOT"
    docker-compose up -d postgres redis
    
    # Wait for PostgreSQL
    wait_for_service "PostgreSQL" "http://localhost:5432" || exit 1
    
    # Wait for Redis
    wait_for_service "Redis" "http://localhost:6379" || exit 1
    
    # Step 2: Run database migrations
    log "Running database migrations..."
    cd "$PROJECT_ROOT"
    npm run migrate || warning "Migration failed, continuing anyway"
    
    # Step 3: Start backend service
    log "Starting backend service..."
    cd "$PROJECT_ROOT"
    npm run dev:backend > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend
    wait_for_service "Backend" "http://localhost:3001/api/health" || exit 1
    
    # Step 4: Start AI service
    log "Starting AI service..."
    if [ -d "$PROJECT_ROOT/python-ai-service" ]; then
        cd "$PROJECT_ROOT/python-ai-service"
        if [ -f "requirements.txt" ]; then
            log "Installing Python dependencies..."
            pip install -r requirements.txt > "$LOG_DIR/pip-install.log" 2>&1
        fi
        python main.py > "$LOG_DIR/ai-service.log" 2>&1 &
        AI_PID=$!
        
        # Wait for AI service
        wait_for_service "AI Service" "http://localhost:8000/health" || warning "AI Service not available"
    else
        warning "AI service directory not found, skipping"
    fi
    
    # Step 5: Start frontend
    log "Starting frontend..."
    cd "$PROJECT_ROOT/frontend"
    npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend
    wait_for_service "Frontend" "http://localhost:3000" || exit 1
    
    # Step 6: Start Nginx (optional)
    if [ "$USE_NGINX" = "true" ]; then
        log "Starting Nginx..."
        docker-compose up -d nginx
        wait_for_service "Nginx" "http://localhost/health" || warning "Nginx not available"
    fi
    
    # Step 7: Start optional services
    if [ "$START_MONITORING" = "true" ]; then
        log "Starting monitoring services..."
        docker-compose up -d pgadmin redis-commander bull-board
    fi
    
    # Display status
    echo ""
    log "========================================="
    log "🚀 CastMatch Stack Started Successfully!"
    log "========================================="
    log ""
    log "Services:"
    log "  Frontend:        http://localhost:3000"
    log "  Backend API:     http://localhost:3001/api"
    log "  AI Service:      http://localhost:8000"
    log "  PostgreSQL:      localhost:5432"
    log "  Redis:           localhost:6379"
    
    if [ "$START_MONITORING" = "true" ]; then
        log ""
        log "Monitoring:"
        log "  PgAdmin:         http://localhost:5050"
        log "  Redis Commander: http://localhost:8081"
        log "  Bull Board:     http://localhost:3002"
    fi
    
    if [ "$USE_NGINX" = "true" ]; then
        log ""
        log "Nginx Proxy:       http://localhost"
    fi
    
    log ""
    log "Logs are available in: $LOG_DIR"
    log ""
    log "To stop all services, press Ctrl+C"
    log "========================================="
    
    # Keep script running and show logs
    if [ "$FOLLOW_LOGS" = "true" ]; then
        log "Following backend logs (Ctrl+C to stop)..."
        tail -f "$LOG_DIR/backend.log"
    else
        # Wait for interrupt
        log "Services are running. Press Ctrl+C to stop."
        wait
    fi
}

# Parse command line arguments
FOLLOW_LOGS=false
START_MONITORING=false
USE_NGINX=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --follow-logs|-f)
            FOLLOW_LOGS=true
            shift
            ;;
        --with-monitoring|-m)
            START_MONITORING=true
            shift
            ;;
        --with-nginx|-n)
            USE_NGINX=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -f, --follow-logs      Follow backend logs after startup"
            echo "  -m, --with-monitoring  Start monitoring services (PgAdmin, Redis Commander, Bull Board)"
            echo "  -n, --with-nginx       Start Nginx reverse proxy"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
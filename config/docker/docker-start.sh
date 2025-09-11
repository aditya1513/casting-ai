#!/bin/bash

# CastMatch Docker Management Script
# Usage: ./docker-start.sh [dev|prod|stop|logs|rebuild]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p logs/nginx logs/ai-service uploads
    chmod 755 logs uploads
}

# Load environment variables
load_env() {
    if [ -f .env ]; then
        log_info "Loading environment variables from .env"
        export $(cat .env | grep -v '^#' | xargs)
    else
        log_warning "No .env file found. Using defaults."
    fi
}

# Development environment
start_dev() {
    log_info "Starting CastMatch in DEVELOPMENT mode..."
    
    check_docker
    create_directories
    load_env
    
    # Build and start services
    docker-compose -f docker-compose.dev.yml up --build -d
    
    log_success "Development environment started!"
    log_info "Services available at:"
    echo "  Frontend:        http://localhost:3000"
    echo "  Backend API:     http://localhost:3001"
    echo "  AI Service:      http://localhost:8000"
    echo "  PgAdmin:         http://localhost:5050 (admin@castmatch.com / admin123)"
    echo "  Redis Commander: http://localhost:8081"
    echo ""
    log_info "View logs with: ./docker-start.sh logs"
    log_info "Stop with: ./docker-start.sh stop"
}

# Production environment
start_prod() {
    log_info "Starting CastMatch in PRODUCTION mode..."
    
    check_docker
    create_directories
    load_env
    
    # Check for required environment variables
    if [ -z "$JWT_SECRET" ] || [ -z "$ANTHROPIC_API_KEY" ]; then
        log_error "Missing required environment variables for production!"
        log_error "Please set JWT_SECRET and ANTHROPIC_API_KEY in .env file"
        exit 1
    fi
    
    # Build and start services
    docker-compose -f docker-compose.yml up --build -d
    
    log_success "Production environment started!"
    log_info "Services available at:"
    echo "  Application:     http://localhost (via Nginx)"
    echo "  PgAdmin:         http://localhost:5050"
    echo "  Redis Commander: http://localhost:8081"
    echo ""
    log_info "View logs with: ./docker-start.sh logs"
    log_info "Stop with: ./docker-start.sh stop"
}

# Stop all services
stop_services() {
    log_info "Stopping all CastMatch services..."
    
    # Stop both dev and prod compose files
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose -f docker-compose.yml down 2>/dev/null || true
    
    log_success "All services stopped!"
}

# Show logs
show_logs() {
    local service=${2:-}
    
    if [ ! -z "$service" ]; then
        log_info "Showing logs for service: $service"
        docker-compose -f docker-compose.dev.yml logs -f "$service" 2>/dev/null || \
        docker-compose -f docker-compose.yml logs -f "$service"
    else
        log_info "Showing logs for all services..."
        docker-compose -f docker-compose.dev.yml logs -f 2>/dev/null || \
        docker-compose -f docker-compose.yml logs -f
    fi
}

# Rebuild specific service
rebuild_service() {
    local service=${2:-}
    
    if [ -z "$service" ]; then
        log_error "Please specify a service to rebuild"
        log_info "Available services: frontend, backend, ai-service"
        exit 1
    fi
    
    log_info "Rebuilding service: $service"
    
    docker-compose -f docker-compose.dev.yml build --no-cache "$service" 2>/dev/null || \
    docker-compose -f docker-compose.yml build --no-cache "$service"
    
    docker-compose -f docker-compose.dev.yml up -d "$service" 2>/dev/null || \
    docker-compose -f docker-compose.yml up -d "$service"
    
    log_success "Service $service rebuilt and restarted!"
}

# Status check
check_status() {
    log_info "Checking service status..."
    
    echo ""
    echo "Development services:"
    docker-compose -f docker-compose.dev.yml ps 2>/dev/null || echo "  Not running"
    
    echo ""
    echo "Production services:"
    docker-compose -f docker-compose.yml ps 2>/dev/null || echo "  Not running"
}

# Clean up (remove containers, networks, volumes)
cleanup() {
    log_warning "This will remove all CastMatch containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up..."
        
        # Stop and remove everything
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
        docker-compose -f docker-compose.yml down -v --remove-orphans 2>/dev/null || true
        
        # Remove CastMatch-related images
        docker images | grep castmatch | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true
        
        log_success "Cleanup completed!"
    else
        log_info "Cleanup cancelled."
    fi
}

# Health check
health_check() {
    log_info "Running health checks..."
    
    local services=("frontend:3000" "backend:3001" "ai-service:8000")
    local healthy=0
    local total=${#services[@]}
    
    for service_port in "${services[@]}"; do
        local service=${service_port%:*}
        local port=${service_port#*:}
        
        if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
            log_success "$service is healthy"
            ((healthy++))
        else
            log_error "$service is unhealthy or not responding"
        fi
    done
    
    echo ""
    if [ $healthy -eq $total ]; then
        log_success "All services are healthy! ($healthy/$total)"
    else
        log_warning "Some services are unhealthy ($healthy/$total)"
    fi
}

# Main script logic
case "${1:-help}" in
    dev|development)
        start_dev
        ;;
    prod|production)
        start_prod
        ;;
    stop)
        stop_services
        ;;
    logs)
        show_logs "$@"
        ;;
    rebuild)
        rebuild_service "$@"
        ;;
    status)
        check_status
        ;;
    health)
        health_check
        ;;
    cleanup)
        cleanup
        ;;
    help|*)
        echo "CastMatch Docker Management Script"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  dev        Start development environment"
        echo "  prod       Start production environment"
        echo "  stop       Stop all services"
        echo "  logs       Show logs for all services"
        echo "  logs <srv> Show logs for specific service"
        echo "  rebuild    Rebuild and restart a service"
        echo "  status     Check service status"
        echo "  health     Run health checks"
        echo "  cleanup    Remove all containers, networks, and volumes"
        echo "  help       Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 dev                  # Start development environment"
        echo "  $0 logs frontend        # Show frontend logs"
        echo "  $0 rebuild backend      # Rebuild backend service"
        echo "  $0 health               # Check all service health"
        ;;
esac
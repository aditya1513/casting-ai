#!/bin/bash

# CastMatch Database Setup and Management Script
# This script provides comprehensive database setup, health checks, and utilities
# for the CastMatch platform with PostgreSQL and Prisma

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
PRISMA_SCHEMA="$PROJECT_ROOT/prisma/schema.prisma"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/database-setup-$(date +%Y%m%d-%H%M%S).log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    log "${RED}❌ Error: $1${NC}"
    log "${YELLOW}Check the log file for details: $LOG_FILE${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Load environment variables
load_env() {
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
        success "Environment variables loaded"
    else
        handle_error ".env file not found at $ENV_FILE"
    fi
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists psql; then
        warning "psql not installed - some features will be limited"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        handle_error "Missing required dependencies: ${missing_deps[*]}"
    fi
    
    success "All prerequisites checked"
}

# Check Docker daemon
check_docker() {
    info "Checking Docker daemon..."
    
    if ! docker info >/dev/null 2>&1; then
        handle_error "Docker daemon is not running. Please start Docker and try again."
    fi
    
    success "Docker daemon is running"
}

# Parse database URL
parse_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        handle_error "DATABASE_URL not set in .env file"
    fi
    
    # Extract components from DATABASE_URL
    # Format: postgresql://username:password@host:port/database
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    info "Database configuration:"
    info "  Host: $DB_HOST"
    info "  Port: $DB_PORT"
    info "  Database: $DB_NAME"
    info "  User: $DB_USER"
}

# Check if PostgreSQL container is running
check_postgres_container() {
    info "Checking PostgreSQL container..."
    
    if docker ps | grep -q "postgres"; then
        success "PostgreSQL container is running"
        return 0
    else
        warning "PostgreSQL container is not running"
        return 1
    fi
}

# Start Docker containers
start_containers() {
    info "Starting Docker containers..."
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        handle_error "docker-compose.yml not found at $DOCKER_COMPOSE_FILE"
    fi
    
    docker-compose up -d postgres redis || handle_error "Failed to start containers"
    
    # Wait for PostgreSQL to be ready
    info "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose exec -T postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; then
            success "PostgreSQL is ready"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        handle_error "PostgreSQL failed to start within 60 seconds"
    fi
}

# Create database if it doesn't exist
create_database() {
    info "Checking if database exists..."
    
    # Use docker exec to run psql command
    if docker-compose exec -T postgres psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        success "Database '$DB_NAME' already exists"
    else
        info "Creating database '$DB_NAME'..."
        docker-compose exec -T postgres psql -U "$DB_USER" -c "CREATE DATABASE \"$DB_NAME\";" || handle_error "Failed to create database"
        success "Database '$DB_NAME' created"
    fi
}

# Install PostgreSQL extensions
install_extensions() {
    info "Installing PostgreSQL extensions..."
    
    # List of extensions to install
    local extensions=("uuid-ossp" "pgcrypto")
    
    for ext in "${extensions[@]}"; do
        info "Installing extension: $ext"
        docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"$ext\";" || warning "Failed to install extension: $ext"
    done
    
    # Try to install pgvector if available
    info "Attempting to install pgvector extension..."
    if docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null; then
        success "pgvector extension installed"
        
        # Update schema.prisma to enable pgvector
        if grep -q "// extensions = \[vector\]" "$PRISMA_SCHEMA"; then
            sed -i.bak 's|// extensions = \[vector\]|extensions = [vector]|' "$PRISMA_SCHEMA"
            info "Enabled pgvector in Prisma schema"
        fi
    else
        warning "pgvector extension not available - AI features will be limited"
    fi
    
    success "PostgreSQL extensions installed"
}

# Run Prisma migrations
run_migrations() {
    info "Running Prisma migrations..."
    
    # Generate Prisma client
    npm run prisma:generate || handle_error "Failed to generate Prisma client"
    
    # Run migrations
    npm run prisma:migrate:deploy || {
        warning "Migration deployment failed, trying development migration..."
        npm run prisma:migrate || handle_error "Failed to run migrations"
    }
    
    success "Database migrations completed"
}

# Seed database
seed_database() {
    info "Seeding database with initial data..."
    
    if [ -f "$PROJECT_ROOT/prisma/seed.ts" ]; then
        npm run prisma:seed || warning "Failed to seed database"
        success "Database seeded"
    else
        warning "Seed file not found, skipping seeding"
    fi
}

# Database health check
health_check() {
    info "Running database health checks..."
    
    local checks_passed=0
    local checks_failed=0
    
    # Check PostgreSQL connection
    if docker-compose exec -T postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; then
        success "PostgreSQL connection: OK"
        checks_passed=$((checks_passed + 1))
    else
        warning "PostgreSQL connection: FAILED"
        checks_failed=$((checks_failed + 1))
    fi
    
    # Check database exists
    if docker-compose exec -T postgres psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        success "Database existence: OK"
        checks_passed=$((checks_passed + 1))
    else
        warning "Database existence: FAILED"
        checks_failed=$((checks_failed + 1))
    fi
    
    # Check tables exist
    local table_count=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$table_count" -gt 0 ]; then
        success "Tables found: $table_count"
        checks_passed=$((checks_passed + 1))
    else
        warning "No tables found in database"
        checks_failed=$((checks_failed + 1))
    fi
    
    # Check Redis connection
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        success "Redis connection: OK"
        checks_passed=$((checks_passed + 1))
    else
        warning "Redis connection: FAILED"
        checks_failed=$((checks_failed + 1))
    fi
    
    # Summary
    echo ""
    info "Health Check Summary:"
    success "  Checks passed: $checks_passed"
    if [ $checks_failed -gt 0 ]; then
        warning "  Checks failed: $checks_failed"
    fi
}

# Reset database (danger!)
reset_database() {
    warning "⚠️  This will DELETE ALL DATA in the database!"
    read -p "Are you sure you want to reset the database? (yes/no): " -r confirm
    
    if [ "$confirm" != "yes" ]; then
        info "Database reset cancelled"
        return
    fi
    
    info "Resetting database..."
    
    # Drop and recreate database
    docker-compose exec -T postgres psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" || warning "Failed to drop database"
    docker-compose exec -T postgres psql -U "$DB_USER" -c "CREATE DATABASE \"$DB_NAME\";" || handle_error "Failed to create database"
    
    # Run migrations and seed
    run_migrations
    seed_database
    
    success "Database reset completed"
}

# Backup database
backup_database() {
    local backup_dir="$PROJECT_ROOT/backups"
    local backup_file="$backup_dir/castmatch-$(date +%Y%m%d-%H%M%S).sql"
    
    mkdir -p "$backup_dir"
    
    info "Creating database backup..."
    
    docker-compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file" || handle_error "Failed to create backup"
    
    # Compress backup
    gzip "$backup_file"
    
    success "Database backup created: ${backup_file}.gz"
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        warning "Please provide a backup file path"
        echo "Usage: $0 restore <backup-file>"
        return
    fi
    
    if [ ! -f "$backup_file" ]; then
        handle_error "Backup file not found: $backup_file"
    fi
    
    warning "This will restore the database from: $backup_file"
    read -p "Are you sure? (yes/no): " -r confirm
    
    if [ "$confirm" != "yes" ]; then
        info "Database restore cancelled"
        return
    fi
    
    info "Restoring database..."
    
    # Check if file is compressed
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker-compose exec -T postgres psql -U "$DB_USER" "$DB_NAME" || handle_error "Failed to restore database"
    else
        docker-compose exec -T postgres psql -U "$DB_USER" "$DB_NAME" < "$backup_file" || handle_error "Failed to restore database"
    fi
    
    success "Database restored from: $backup_file"
}

# Fix common Prisma P1010 error
fix_prisma_p1010() {
    info "Fixing Prisma P1010 error..."
    
    # Create _prisma_migrations table if it doesn't exist
    docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id                      VARCHAR(36) PRIMARY KEY,
    checksum                VARCHAR(64) NOT NULL,
    finished_at             TIMESTAMPTZ,
    migration_name          VARCHAR(255) NOT NULL,
    logs                    TEXT,
    rolled_back_at          TIMESTAMPTZ,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count     INTEGER NOT NULL DEFAULT 0
);
EOF
    
    # Grant permissions
    docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$DB_USER";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "$DB_USER";
GRANT ALL PRIVILEGES ON SCHEMA public TO "$DB_USER";
EOF
    
    success "Prisma P1010 fix applied"
}

# Interactive menu
show_menu() {
    echo ""
    echo "========================================="
    echo "   CastMatch Database Management Tool    "
    echo "========================================="
    echo "1) Full Setup (Recommended for first run)"
    echo "2) Start Containers"
    echo "3) Run Migrations"
    echo "4) Seed Database"
    echo "5) Health Check"
    echo "6) Fix Prisma P1010 Error"
    echo "7) Reset Database (⚠️  Danger!)"
    echo "8) Backup Database"
    echo "9) Restore Database"
    echo "0) Exit"
    echo "========================================="
    read -p "Select an option: " choice
    
    case $choice in
        1)
            full_setup
            ;;
        2)
            load_env
            parse_database_url
            start_containers
            ;;
        3)
            load_env
            run_migrations
            ;;
        4)
            load_env
            seed_database
            ;;
        5)
            load_env
            parse_database_url
            health_check
            ;;
        6)
            load_env
            parse_database_url
            fix_prisma_p1010
            ;;
        7)
            load_env
            parse_database_url
            reset_database
            ;;
        8)
            load_env
            parse_database_url
            backup_database
            ;;
        9)
            read -p "Enter backup file path: " backup_path
            load_env
            parse_database_url
            restore_database "$backup_path"
            ;;
        0)
            info "Exiting..."
            exit 0
            ;;
        *)
            warning "Invalid option"
            show_menu
            ;;
    esac
}

# Full setup process
full_setup() {
    info "Starting full database setup..."
    
    check_prerequisites
    check_docker
    load_env
    parse_database_url
    
    if ! check_postgres_container; then
        start_containers
    fi
    
    create_database
    install_extensions
    fix_prisma_p1010
    run_migrations
    seed_database
    health_check
    
    echo ""
    success "🎉 Database setup completed successfully!"
    info "You can now start the application with: npm run dev"
}

# Main execution
main() {
    echo ""
    log "${BLUE}CastMatch Database Setup Script${NC}"
    log "${BLUE}================================${NC}"
    log "Timestamp: $(date)"
    log "Log file: $LOG_FILE"
    echo ""
    
    # Check if script is run with arguments
    if [ $# -eq 0 ]; then
        show_menu
    else
        case "$1" in
            setup)
                full_setup
                ;;
            start)
                load_env
                parse_database_url
                start_containers
                ;;
            migrate)
                load_env
                run_migrations
                ;;
            seed)
                load_env
                seed_database
                ;;
            health)
                load_env
                parse_database_url
                health_check
                ;;
            fix-p1010)
                load_env
                parse_database_url
                fix_prisma_p1010
                ;;
            reset)
                load_env
                parse_database_url
                reset_database
                ;;
            backup)
                load_env
                parse_database_url
                backup_database
                ;;
            restore)
                load_env
                parse_database_url
                restore_database "$2"
                ;;
            help|--help|-h)
                echo "Usage: $0 [command]"
                echo ""
                echo "Commands:"
                echo "  setup       - Run full database setup"
                echo "  start       - Start Docker containers"
                echo "  migrate     - Run database migrations"
                echo "  seed        - Seed database with initial data"
                echo "  health      - Run health checks"
                echo "  fix-p1010   - Fix Prisma P1010 error"
                echo "  reset       - Reset database (deletes all data)"
                echo "  backup      - Create database backup"
                echo "  restore     - Restore database from backup"
                echo "  help        - Show this help message"
                echo ""
                echo "If no command is provided, an interactive menu will be shown."
                ;;
            *)
                warning "Unknown command: $1"
                echo "Run '$0 help' for usage information"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"
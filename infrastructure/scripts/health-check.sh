#!/bin/bash

# CastMatch Infrastructure Health Check Script
# Author: DevOps Infrastructure Developer
# Purpose: Monitor the health of all critical services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_CONTAINER="castmatch-postgres"
REDIS_CONTAINER="castmatch-redis"
POSTGRES_DB="castmatch_db"
POSTGRES_USER="postgres"
REDIS_PASSWORD="castmatch_redis_password"

# Function to check service health
check_service() {
    local service_name=$1
    local check_command=$2
    
    echo -n "Checking $service_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to get container status
get_container_status() {
    local container=$1
    docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not found"
}

# Function to get container health
get_container_health() {
    local container=$1
    docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no health check"
}

echo "========================================="
echo "CastMatch Infrastructure Health Check"
echo "========================================="
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check Docker daemon
echo "1. Docker Service"
echo "-----------------"
check_service "Docker daemon" "docker info"
echo ""

# Check PostgreSQL
echo "2. PostgreSQL Database"
echo "----------------------"
POSTGRES_STATUS=$(get_container_status "$POSTGRES_CONTAINER")
POSTGRES_HEALTH=$(get_container_health "$POSTGRES_CONTAINER")
echo "Container Status: $POSTGRES_STATUS"
echo "Health Status: $POSTGRES_HEALTH"

if [ "$POSTGRES_STATUS" = "running" ]; then
    check_service "PostgreSQL connection" "docker exec $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT 1' > /dev/null 2>&1"
    
    # Check database size
    DB_SIZE=$(docker exec $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'))" | xargs)
    echo "Database Size: $DB_SIZE"
    
    # Check connection count
    CONN_COUNT=$(docker exec $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT count(*) FROM pg_stat_activity" | xargs)
    echo "Active Connections: $CONN_COUNT"
else
    echo -e "${RED}PostgreSQL container is not running!${NC}"
fi
echo ""

# Check Redis
echo "3. Redis Cache"
echo "--------------"
REDIS_STATUS=$(get_container_status "$REDIS_CONTAINER")
REDIS_HEALTH=$(get_container_health "$REDIS_CONTAINER")
echo "Container Status: $REDIS_STATUS"
echo "Health Status: $REDIS_HEALTH"

if [ "$REDIS_STATUS" = "running" ]; then
    check_service "Redis connection" "docker exec $REDIS_CONTAINER redis-cli -a $REDIS_PASSWORD ping"
    
    # Get Redis info
    REDIS_MEMORY=$(docker exec $REDIS_CONTAINER redis-cli -a $REDIS_PASSWORD INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    REDIS_KEYS=$(docker exec $REDIS_CONTAINER redis-cli -a $REDIS_PASSWORD DBSIZE 2>/dev/null | cut -d' ' -f2)
    echo "Memory Usage: $REDIS_MEMORY"
    echo "Total Keys: $REDIS_KEYS"
else
    echo -e "${RED}Redis container is not running!${NC}"
fi
echo ""

# Check disk usage
echo "4. Disk Usage"
echo "-------------"
DOCKER_VOLUME_PATH="/var/lib/docker/volumes"
if [ -d "$DOCKER_VOLUME_PATH" ]; then
    df -h "$DOCKER_VOLUME_PATH" 2>/dev/null | tail -1 | awk '{print "Docker Volumes: " $3 " used of " $2 " (" $5 " full)"}'
fi
df -h . | tail -1 | awk '{print "Project Directory: " $3 " used of " $2 " (" $5 " full)"}'
echo ""

# Check network
echo "5. Docker Network"
echo "-----------------"
NETWORK_NAME="castmatch-network"
if docker network inspect "$NETWORK_NAME" > /dev/null 2>&1; then
    CONTAINERS_IN_NETWORK=$(docker network inspect "$NETWORK_NAME" -f '{{len .Containers}}')
    echo -e "${GREEN}✓ Network '$NETWORK_NAME' exists${NC}"
    echo "Containers in network: $CONTAINERS_IN_NETWORK"
else
    echo -e "${RED}✗ Network '$NETWORK_NAME' not found${NC}"
fi
echo ""

# Check ports
echo "6. Port Availability"
echo "--------------------"
PORTS=("5432:PostgreSQL" "6379:Redis" "5003:Backend" "3000:Frontend" "8081:Redis-Commander" "5050:PgAdmin")

for port_info in "${PORTS[@]}"; do
    PORT="${port_info%%:*}"
    SERVICE="${port_info#*:}"
    
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Port $PORT ($SERVICE) is in use${NC}"
    else
        echo -e "${YELLOW}○ Port $PORT ($SERVICE) is available${NC}"
    fi
done
echo ""

# Summary
echo "========================================="
echo "Health Check Summary"
echo "========================================="

CRITICAL_ISSUES=0
if [ "$POSTGRES_STATUS" != "running" ]; then
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if [ "$REDIS_STATUS" != "running" ]; then
    echo -e "${RED}✗ Redis is not running${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if [ $CRITICAL_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All critical services are operational${NC}"
    exit 0
else
    echo -e "${RED}✗ Found $CRITICAL_ISSUES critical issue(s)${NC}"
    exit 1
fi
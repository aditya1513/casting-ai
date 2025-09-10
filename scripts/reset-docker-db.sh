#!/bin/bash

# CastMatch Database Reset Script
# This script helps reset the PostgreSQL database in Docker when permission issues occur

echo "================================================"
echo "CastMatch Database Reset Script"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Warning: This will reset your PostgreSQL database and remove all data!${NC}"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled"
    exit 0
fi

echo ""
echo "Step 1: Stopping PostgreSQL container..."
docker-compose stop postgres

echo ""
echo "Step 2: Removing PostgreSQL container..."
docker-compose rm -f postgres

echo ""
echo "Step 3: Removing PostgreSQL volume..."
docker volume rm casting-ai_postgres_data 2>/dev/null || true

echo ""
echo "Step 4: Recreating PostgreSQL container with proper permissions..."
docker-compose up -d postgres

echo ""
echo "Step 5: Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for PostgreSQL to be fully ready
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec postgres pg_isready -U postgres -d castmatch_db &>/dev/null; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    echo "Waiting for PostgreSQL to be ready... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Error: PostgreSQL failed to start properly${NC}"
    exit 1
fi

echo ""
echo "Step 6: Verifying database access..."
docker-compose exec postgres psql -U postgres -d castmatch_db -c "\l" &>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Success: Database is accessible!${NC}"
    echo ""
    echo "Database connection details:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: castmatch_db"
    echo "  User: postgres"
    echo "  Password: castmatch123"
    echo ""
    echo -e "${GREEN}Database has been successfully reset with proper permissions!${NC}"
else
    echo -e "${RED}Error: Could not access database${NC}"
    echo "Please check the docker-compose logs:"
    echo "  docker-compose logs postgres"
    exit 1
fi

echo ""
echo "Step 7: Running Prisma migrations (if needed)..."
if [ -f "prisma/schema.prisma" ]; then
    echo "Found Prisma schema. To apply migrations, run:"
    echo "  npx prisma migrate deploy"
    echo "  npx prisma generate"
else
    echo "No Prisma schema found. Skipping migrations."
fi

echo ""
echo "================================================"
echo -e "${GREEN}Database reset completed successfully!${NC}"
echo "================================================"
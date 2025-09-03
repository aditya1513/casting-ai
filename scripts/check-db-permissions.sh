#!/bin/bash

# CastMatch Database Permission Check Script
# This script verifies that PostgreSQL permissions are correctly configured

echo "================================================"
echo "CastMatch Database Permission Check"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if PostgreSQL container is running
if ! docker-compose ps | grep -q "castmatch-postgres.*Up"; then
    echo -e "${RED}Error: PostgreSQL container is not running${NC}"
    echo "Start it with: docker-compose up -d postgres"
    exit 1
fi

echo -e "${BLUE}Checking database permissions...${NC}"
echo ""

# Test 1: Connection test
echo "1. Testing connection to database..."
docker-compose exec -T postgres psql -U postgres -d castmatch_db -c "SELECT 1" &>/dev/null
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓ Connection successful${NC}"
else
    echo -e "   ${RED}✗ Connection failed${NC}"
    exit 1
fi

# Test 2: Check database ownership
echo "2. Checking database ownership..."
OWNER=$(docker-compose exec -T postgres psql -U postgres -d castmatch_db -t -c "SELECT d.datname, pg_catalog.pg_get_userbyid(d.datdba) as owner FROM pg_catalog.pg_database d WHERE d.datname = 'castmatch_db'" | xargs)
if [[ $OWNER == *"postgres"* ]]; then
    echo -e "   ${GREEN}✓ Database owner is postgres${NC}"
else
    echo -e "   ${RED}✗ Database owner is not postgres${NC}"
fi

# Test 3: Check schema permissions
echo "3. Checking public schema permissions..."
SCHEMA_OWNER=$(docker-compose exec -T postgres psql -U postgres -d castmatch_db -t -c "SELECT nspowner::regrole FROM pg_namespace WHERE nspname = 'public'" | xargs)
if [[ $SCHEMA_OWNER == *"postgres"* ]]; then
    echo -e "   ${GREEN}✓ Public schema owner is postgres${NC}"
else
    echo -e "   ${YELLOW}⚠ Public schema owner is: $SCHEMA_OWNER${NC}"
fi

# Test 4: Test table creation
echo "4. Testing table creation permissions..."
docker-compose exec -T postgres psql -U postgres -d castmatch_db -c "CREATE TABLE IF NOT EXISTS test_permissions (id SERIAL PRIMARY KEY, test VARCHAR(50))" &>/dev/null
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓ Can create tables${NC}"
    # Clean up test table
    docker-compose exec -T postgres psql -U postgres -d castmatch_db -c "DROP TABLE IF EXISTS test_permissions" &>/dev/null
else
    echo -e "   ${RED}✗ Cannot create tables${NC}"
fi

# Test 5: Check for extensions
echo "5. Checking installed extensions..."
EXTENSIONS=$(docker-compose exec -T postgres psql -U postgres -d castmatch_db -t -c "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto')")
if [[ $EXTENSIONS == *"uuid-ossp"* ]]; then
    echo -e "   ${GREEN}✓ uuid-ossp extension installed${NC}"
else
    echo -e "   ${YELLOW}⚠ uuid-ossp extension not installed${NC}"
fi
if [[ $EXTENSIONS == *"pgcrypto"* ]]; then
    echo -e "   ${GREEN}✓ pgcrypto extension installed${NC}"
else
    echo -e "   ${YELLOW}⚠ pgcrypto extension not installed${NC}"
fi

# Test 6: Check connection limits
echo "6. Checking connection configuration..."
MAX_CONN=$(docker-compose exec -T postgres psql -U postgres -d castmatch_db -t -c "SHOW max_connections" | xargs)
echo -e "   ${BLUE}ℹ Max connections: $MAX_CONN${NC}"

# Test 7: Check authentication method
echo "7. Checking authentication method..."
AUTH_METHOD=$(docker-compose exec -T postgres psql -U postgres -d postgres -t -c "SHOW password_encryption" | xargs)
echo -e "   ${BLUE}ℹ Password encryption: $AUTH_METHOD${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}Permission check completed!${NC}"
echo "================================================"
echo ""

# Summary
echo "Database Connection String:"
echo -e "${BLUE}postgresql://postgres:castmatch123@localhost:5432/castmatch_db${NC}"
echo ""
echo "For Docker containers, use:"
echo -e "${BLUE}postgresql://postgres:castmatch123@postgres:5432/castmatch_db${NC}"
echo ""

# Check if Prisma is installed
if [ -f "node_modules/.bin/prisma" ]; then
    echo "To apply Prisma migrations, run:"
    echo -e "${YELLOW}npx prisma migrate deploy${NC}"
    echo -e "${YELLOW}npx prisma db push${NC} (for development)"
fi
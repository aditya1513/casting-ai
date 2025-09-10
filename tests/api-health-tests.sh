#!/bin/bash

# CastMatch API Health Tests
# Tests all non-database dependent endpoints

set -e

BASE_URL="http://localhost:5002/api"
PASS_COUNT=0
FAIL_COUNT=0
TOTAL_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run test
run_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local expected_content="$5"
    local headers="$6"
    
    ((TOTAL_COUNT++))
    
    echo -e "\n${YELLOW}Testing: $test_name${NC}"
    echo "Method: $method"
    echo "Endpoint: $BASE_URL$endpoint"
    
    if [ "$method" = "GET" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -H "$headers" "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
        fi
    elif [ "$method" = "POST" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST -H "$headers" "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint")
        fi
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    echo "Response Status: $status_code"
    echo "Response Body: $body" | head -c 200
    echo "..."
    
    # Check status code
    if [ "$status_code" = "$expected_status" ]; then
        if [ -n "$expected_content" ] && ! echo "$body" | grep -q "$expected_content"; then
            echo -e "${RED}❌ FAIL: Expected content '$expected_content' not found${NC}"
            ((FAIL_COUNT++))
        else
            echo -e "${GREEN}✅ PASS: Test completed successfully${NC}"
            ((PASS_COUNT++))
        fi
    else
        echo -e "${RED}❌ FAIL: Expected status $expected_status, got $status_code${NC}"
        ((FAIL_COUNT++))
    fi
}

echo "========================================="
echo "CastMatch API Health & Basic Tests"
echo "========================================="
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date)"
echo "========================================="

# Test 1: Basic Health Check
run_test "Basic Health Check" "GET" "/health" "200" "healthy"

# Test 2: Health Ready Check (may fail due to database)
run_test "Health Ready Check" "GET" "/health/ready" "" ""

# Test 3: Health Live Check
run_test "Health Live Check" "GET" "/health/live" "200" "alive"

# Test 4: Pinecone Health Check
run_test "Pinecone Health Check" "GET" "/pinecone/health" "200" ""

# Test 5: Invalid endpoint (404 test)
run_test "Invalid Endpoint Test" "GET" "/invalid-endpoint" "404" "Not Found"

# Test 6: CORS Preflight Test
run_test "CORS Preflight Test" "OPTIONS" "/health" "200" ""

# Test 7: Content-Type handling
run_test "JSON Content-Type Test" "POST" "/health" "405" "" "Content-Type: application/json"

# Test 8: Rate Limiting Test (first request)
run_test "Rate Limiting Test" "GET" "/health" "200" "healthy"

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo -e "Total Tests: $TOTAL_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All basic health tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  $FAIL_COUNT test(s) failed${NC}"
    exit 1
fi
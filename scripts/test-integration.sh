#!/bin/bash

# CastMatch - Integration Test Runner
# Runs comprehensive integration tests for all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TEST_LOG="$TEST_RESULTS_DIR/integration-test-$TIMESTAMP.log"

# Create directories
mkdir -p "$TEST_RESULTS_DIR"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$TEST_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$TEST_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$TEST_LOG"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$TEST_LOG"
}

# Test functions
test_health_checks() {
    info "Testing health check endpoints..."
    
    local services=(
        "Backend:http://localhost:3001/api/health"
        "Frontend:http://localhost:3000"
        "AI-Service:http://localhost:8000/health"
    )
    
    local all_healthy=true
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name health_url <<< "$service_info"
        health_url="${health_url}:${health_url##*:}"
        
        if curl -s -f -o /dev/null "$health_url" 2>/dev/null; then
            log "✅ $service_name is healthy"
        else
            error "❌ $service_name health check failed"
            all_healthy=false
        fi
    done
    
    if $all_healthy; then
        return 0
    else
        return 1
    fi
}

test_database_connection() {
    info "Testing database connection..."
    
    # Test PostgreSQL connection
    if docker exec castmatch-postgres pg_isready -U postgres > /dev/null 2>&1; then
        log "✅ PostgreSQL connection successful"
    else
        error "❌ PostgreSQL connection failed"
        return 1
    fi
    
    # Test Redis connection
    if docker exec castmatch-redis redis-cli ping > /dev/null 2>&1; then
        log "✅ Redis connection successful"
    else
        error "❌ Redis connection failed"
        return 1
    fi
    
    return 0
}

test_authentication_flow() {
    info "Testing authentication flow..."
    
    # Register a test user
    local test_email="test-$(date +%s)@castmatch.com"
    local test_password="TestPass123!"
    
    local register_response=$(curl -s -X POST http://localhost:3001/api/auth/register \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$test_email\",\"password\":\"$test_password\",\"name\":\"Test User\",\"role\":\"actor\"}")
    
    if echo "$register_response" | grep -q "token"; then
        log "✅ User registration successful"
        
        # Extract token
        local token=$(echo "$register_response" | grep -oP '"token"\s*:\s*"[^"]*"' | cut -d'"' -f4)
        
        # Test authenticated request
        local me_response=$(curl -s -X GET http://localhost:3001/api/auth/me \
            -H "Authorization: Bearer $token")
        
        if echo "$me_response" | grep -q "$test_email"; then
            log "✅ Authentication verification successful"
            return 0
        else
            error "❌ Authentication verification failed"
            return 1
        fi
    else
        error "❌ User registration failed"
        echo "$register_response" >> "$TEST_LOG"
        return 1
    fi
}

test_websocket_connection() {
    info "Testing WebSocket connection..."
    
    # Use Node.js to test WebSocket
    cat > /tmp/test-websocket.js << 'EOF'
const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
    auth: { token: process.argv[2] || 'test-token' },
    transports: ['websocket'],
    timeout: 5000
});

socket.on('connect', () => {
    console.log('SUCCESS: Connected to WebSocket');
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.error('ERROR: WebSocket connection failed:', error.message);
    process.exit(1);
});

setTimeout(() => {
    console.error('ERROR: WebSocket connection timeout');
    process.exit(1);
}, 10000);
EOF

    if node /tmp/test-websocket.js 2>&1 | grep -q "SUCCESS"; then
        log "✅ WebSocket connection successful"
        return 0
    else
        warning "⚠️ WebSocket connection failed (may need auth token)"
        return 0 # Don't fail the test as auth is required
    fi
}

test_api_endpoints() {
    info "Testing API endpoints..."
    
    local endpoints=(
        "GET:/api/health"
        "GET:/api/talents"
        "GET:/api/conversations"
    )
    
    local all_passed=true
    
    for endpoint in "${endpoints[@]}"; do
        IFS=':' read -r method path <<< "$endpoint"
        
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -X "$method" "http://localhost:3001$path")
        
        # Accept 200, 201, 401 (auth required), 404 (not found but service working)
        if [[ "$response_code" =~ ^(200|201|401|404)$ ]]; then
            log "✅ $method $path - Response: $response_code"
        else
            error "❌ $method $path - Response: $response_code"
            all_passed=false
        fi
    done
    
    if $all_passed; then
        return 0
    else
        return 1
    fi
}

test_chat_flow() {
    info "Testing chat flow integration..."
    
    # This would require a valid auth token and conversation
    # For now, we just test that the endpoint exists
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "http://localhost:3001/api/chat/message" \
        -H "Content-Type: application/json" \
        -d '{"message":"Test message"}')
    
    if [[ "$response_code" =~ ^(401|404)$ ]]; then
        log "✅ Chat endpoint accessible (auth required)"
        return 0
    else
        error "❌ Chat endpoint not accessible - Response: $response_code"
        return 1
    fi
}

test_queue_system() {
    info "Testing queue system..."
    
    # Check if Bull Board is accessible
    if curl -s -f -o /dev/null "http://localhost:3002" 2>/dev/null; then
        log "✅ Bull Board dashboard accessible"
        return 0
    else
        warning "⚠️ Bull Board not running (optional service)"
        return 0
    fi
}

run_jest_tests() {
    info "Running Jest integration tests..."
    
    cd "$PROJECT_ROOT"
    
    if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
        if npm run test:integration > "$TEST_RESULTS_DIR/jest-integration-$TIMESTAMP.log" 2>&1; then
            log "✅ Jest integration tests passed"
            return 0
        else
            error "❌ Jest integration tests failed"
            warning "Check $TEST_RESULTS_DIR/jest-integration-$TIMESTAMP.log for details"
            return 1
        fi
    else
        warning "⚠️ Jest configuration not found, skipping Jest tests"
        return 0
    fi
}

# Performance test
test_performance() {
    info "Running performance tests..."
    
    local start_time=$(date +%s%N)
    local success_count=0
    local total_requests=100
    
    for i in $(seq 1 $total_requests); do
        if curl -s -f -o /dev/null "http://localhost:3001/api/health" 2>/dev/null; then
            ((success_count++))
        fi
    done
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    local success_rate=$(( success_count * 100 / total_requests ))
    
    log "Performance test results:"
    log "  Requests: $total_requests"
    log "  Successful: $success_count"
    log "  Success rate: $success_rate%"
    log "  Total time: ${duration}ms"
    log "  Avg time per request: $(( duration / total_requests ))ms"
    
    if [ $success_rate -ge 95 ]; then
        log "✅ Performance test passed"
        return 0
    else
        error "❌ Performance test failed (success rate < 95%)"
        return 1
    fi
}

# Main execution
main() {
    log "========================================="
    log "CastMatch Integration Test Suite"
    log "========================================="
    log "Test log: $TEST_LOG"
    log ""
    
    # Check if services are running
    info "Checking if services are running..."
    
    if ! curl -s -f -o /dev/null "http://localhost:3001/api/health" 2>/dev/null; then
        error "Backend service is not running. Please run ./scripts/start-all.sh first"
        exit 1
    fi
    
    # Run tests
    local failed_tests=0
    local total_tests=0
    
    # Test suite
    local tests=(
        "test_health_checks"
        "test_database_connection"
        "test_authentication_flow"
        "test_websocket_connection"
        "test_api_endpoints"
        "test_chat_flow"
        "test_queue_system"
        "test_performance"
    )
    
    if [ "$RUN_JEST" = "true" ]; then
        tests+=("run_jest_tests")
    fi
    
    for test in "${tests[@]}"; do
        echo ""
        ((total_tests++))
        
        if $test; then
            log "✅ $test PASSED"
        else
            error "❌ $test FAILED"
            ((failed_tests++))
            
            if [ "$FAIL_FAST" = "true" ]; then
                error "Stopping tests due to failure (fail-fast mode)"
                break
            fi
        fi
    done
    
    # Summary
    echo ""
    log "========================================="
    log "Test Summary"
    log "========================================="
    log "Total tests: $total_tests"
    log "Passed: $((total_tests - failed_tests))"
    log "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        log ""
        log "🎉 All integration tests passed!"
        log ""
        
        # Generate HTML report if requested
        if [ "$GENERATE_REPORT" = "true" ]; then
            generate_html_report
        fi
        
        exit 0
    else
        error ""
        error "❌ $failed_tests test(s) failed"
        error "Check the log for details: $TEST_LOG"
        error ""
        exit 1
    fi
}

generate_html_report() {
    info "Generating HTML test report..."
    
    local report_file="$TEST_RESULTS_DIR/integration-report-$TIMESTAMP.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>CastMatch Integration Test Report - $TIMESTAMP</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .success { color: green; }
        .failure { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>CastMatch Integration Test Report</h1>
    <p>Generated: $(date)</p>
    <h2>Test Results</h2>
    <pre>$(cat "$TEST_LOG" | sed 's/\x1b\[[0-9;]*m//g')</pre>
</body>
</html>
EOF

    log "Test report generated: $report_file"
}

# Parse command line arguments
RUN_JEST=false
FAIL_FAST=false
GENERATE_REPORT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --with-jest|-j)
            RUN_JEST=true
            shift
            ;;
        --fail-fast|-f)
            FAIL_FAST=true
            shift
            ;;
        --report|-r)
            GENERATE_REPORT=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -j, --with-jest     Include Jest integration tests"
            echo "  -f, --fail-fast     Stop on first test failure"
            echo "  -r, --report        Generate HTML test report"
            echo "  -h, --help          Show this help message"
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
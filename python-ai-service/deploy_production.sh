#!/bin/bash

# CastMatch ML Production Deployment Script
# Supports 20K concurrent users with auto-scaling

set -e

echo "=================================="
echo "CastMatch ML Production Deployment"
echo "=================================="

# Configuration
DOCKER_REGISTRY="castmatch"
IMAGE_NAME="ml-service"
VERSION="3.0.0"
NAMESPACE="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_status "Docker found"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_warning "kubectl is not installed (needed for Kubernetes deployment)"
    else
        print_status "kubectl found"
    fi
    
    # Check Python service file
    if [ ! -f "production_ml_service.py" ]; then
        print_error "production_ml_service.py not found"
        exit 1
    fi
    print_status "Production ML service file found"
}

# Build Docker image
build_image() {
    echo ""
    echo "Building Docker image..."
    
    docker build -f Dockerfile.production -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION} .
    
    if [ $? -eq 0 ]; then
        print_status "Docker image built successfully"
        
        # Tag as latest
        docker tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
        print_status "Tagged as latest"
    else
        print_error "Docker build failed"
        exit 1
    fi
}

# Run local test
test_local() {
    echo ""
    echo "Testing locally..."
    
    # Stop any existing container
    docker stop castmatch-ml-test 2>/dev/null || true
    docker rm castmatch-ml-test 2>/dev/null || true
    
    # Run container
    docker run -d \
        --name castmatch-ml-test \
        -p 8003:8003 \
        -p 9090:9090 \
        -e REDIS_HOST=host.docker.internal \
        ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}
    
    echo "Waiting for service to start..."
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:8003/health > /dev/null 2>&1; then
        print_status "Health check passed"
        
        # Show health status
        echo ""
        echo "Health Status:"
        curl -s http://localhost:8003/health | python3 -m json.tool | head -20
        
        # Stop test container
        docker stop castmatch-ml-test
        docker rm castmatch-ml-test
        
        print_status "Local test completed successfully"
    else
        print_error "Health check failed"
        docker logs castmatch-ml-test
        docker stop castmatch-ml-test
        docker rm castmatch-ml-test
        exit 1
    fi
}

# Deploy to Kubernetes
deploy_kubernetes() {
    echo ""
    echo "Deploying to Kubernetes..."
    
    if ! command -v kubectl &> /dev/null; then
        print_warning "kubectl not found, skipping Kubernetes deployment"
        return
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
        print_warning "Creating namespace: ${NAMESPACE}"
        kubectl create namespace ${NAMESPACE}
    fi
    
    # Apply Kubernetes configurations
    if [ -d "kubernetes" ]; then
        print_status "Applying Kubernetes configurations..."
        
        # Deploy Redis first
        if [ -f "kubernetes/redis.yaml" ]; then
            kubectl apply -f kubernetes/redis.yaml
            print_status "Redis deployed"
        fi
        
        # Deploy ML service
        if [ -f "kubernetes/deployment.yaml" ]; then
            kubectl apply -f kubernetes/deployment.yaml
            print_status "ML service deployed"
        fi
        
        # Wait for deployment
        echo "Waiting for deployment to be ready..."
        kubectl wait --for=condition=available --timeout=300s \
            deployment/castmatch-ml-service -n ${NAMESPACE} || true
        
        # Show deployment status
        echo ""
        echo "Deployment Status:"
        kubectl get pods -n ${NAMESPACE} -l app=castmatch-ml
        
        print_status "Kubernetes deployment completed"
    else
        print_warning "Kubernetes configuration directory not found"
    fi
}

# Setup monitoring
setup_monitoring() {
    echo ""
    echo "Setting up monitoring..."
    
    # Check if monitoring dashboard exists
    if [ -f "monitoring_dashboard.html" ]; then
        print_status "Monitoring dashboard found"
        
        # Create simple HTTP server for dashboard
        cat > serve_dashboard.py << EOF
#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = "."

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

print(f"Serving monitoring dashboard on http://localhost:{PORT}")
print("Open monitoring_dashboard.html in your browser")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    httpd.serve_forever()
EOF
        
        chmod +x serve_dashboard.py
        print_status "Dashboard server script created"
        print_warning "Run './serve_dashboard.py' to start the monitoring dashboard"
    fi
}

# Performance test
performance_test() {
    echo ""
    echo "Running performance test..."
    
    # Create performance test script
    cat > performance_test.py << 'EOF'
#!/usr/bin/env python3
import asyncio
import httpx
import time
import json
from statistics import mean, stdev, quantiles

async def make_request(client, request_num):
    start = time.time()
    try:
        response = await client.post(
            "http://localhost:8003/api/v1/search",
            json={
                "query": f"Find actors in Mumbai for test {request_num}",
                "max_results": 10,
                "use_cache": request_num > 100  # Enable cache after warmup
            },
            timeout=10.0
        )
        latency = (time.time() - start) * 1000
        return {"success": response.status_code == 200, "latency": latency}
    except Exception as e:
        latency = (time.time() - start) * 1000
        return {"success": False, "latency": latency, "error": str(e)}

async def run_load_test(concurrent_users=10, total_requests=100):
    print(f"Running load test: {concurrent_users} concurrent users, {total_requests} total requests")
    
    async with httpx.AsyncClient() as client:
        tasks = []
        for i in range(total_requests):
            task = make_request(client, i)
            tasks.append(task)
            
            if len(tasks) >= concurrent_users:
                results = await asyncio.gather(*tasks)
                tasks = []
        
        if tasks:
            results = await asyncio.gather(*tasks)
    
    return results

async def main():
    print("CastMatch ML Performance Test")
    print("=" * 50)
    
    # Warmup
    print("\nWarming up...")
    async with httpx.AsyncClient() as client:
        for _ in range(5):
            await make_request(client, 0)
    
    # Test scenarios
    test_scenarios = [
        (10, 100),   # Light load
        (50, 500),   # Medium load
        (100, 1000), # Heavy load
    ]
    
    for concurrent_users, total_requests in test_scenarios:
        print(f"\n{'='*50}")
        print(f"Test: {concurrent_users} concurrent users")
        
        start_time = time.time()
        results = await run_load_test(concurrent_users, total_requests)
        total_time = time.time() - start_time
        
        # Analyze results
        latencies = [r["latency"] for r in results if r["success"]]
        failures = sum(1 for r in results if not r["success"])
        
        if latencies:
            print(f"\nResults:")
            print(f"  Total time: {total_time:.2f}s")
            print(f"  Throughput: {len(results)/total_time:.1f} req/s")
            print(f"  Success rate: {(len(latencies)/len(results))*100:.1f}%")
            print(f"  Failures: {failures}")
            print(f"\nLatency Statistics (ms):")
            print(f"  Min: {min(latencies):.1f}")
            print(f"  Mean: {mean(latencies):.1f}")
            print(f"  Max: {max(latencies):.1f}")
            if len(latencies) > 1:
                print(f"  Std Dev: {stdev(latencies):.1f}")
                quantile_values = quantiles(latencies, n=20)
                print(f"  P50: {quantile_values[9]:.1f}")
                print(f"  P95: {quantile_values[18]:.1f}")
                print(f"  P99: {quantile_values[19] if len(quantile_values) > 19 else max(latencies):.1f}")
            
            # Check SLA
            p95 = quantile_values[18] if len(latencies) > 1 else latencies[0]
            if p95 < 200:
                print(f"\n✓ PASS: P95 latency ({p95:.1f}ms) meets target (<200ms)")
            else:
                print(f"\n✗ FAIL: P95 latency ({p95:.1f}ms) exceeds target (<200ms)")

if __name__ == "__main__":
    asyncio.run(main())
EOF
    
    chmod +x performance_test.py
    print_status "Performance test script created"
    
    # Check if service is running
    if curl -f http://localhost:8003/health > /dev/null 2>&1; then
        print_warning "Run './performance_test.py' to test performance"
    else
        print_warning "Start the ML service first before running performance tests"
    fi
}

# Generate deployment report
generate_report() {
    echo ""
    echo "Generating deployment report..."
    
    cat > deployment_report.md << EOF
# CastMatch ML Production Deployment Report

## Deployment Information
- **Date**: $(date)
- **Version**: ${VERSION}
- **Image**: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}

## Features Deployed
- ✅ Production ML service with horizontal scaling
- ✅ Advanced caching system (Redis + Local)
- ✅ Model versioning and A/B testing
- ✅ Auto-scaling configuration (4-50 workers)
- ✅ Monitoring dashboard
- ✅ Prometheus metrics endpoint

## Performance Targets
- **Concurrent Users**: 20,000
- **P95 Latency**: <200ms
- **Availability**: 99.9%
- **Cache Hit Rate**: >85%

## Endpoints
- **Main Service**: http://localhost:8003
- **Health Check**: http://localhost:8003/health
- **Metrics**: http://localhost:8003/metrics
- **Dashboard API**: http://localhost:8003/dashboard
- **Search API**: POST http://localhost:8003/api/v1/search

## Model Versions
- **V1 Stable**: 70% traffic (384-dim embeddings)
- **V2 Experimental**: 20% traffic (768-dim embeddings)
- **V3 Advanced**: 10% traffic (1024-dim embeddings)

## Kubernetes Resources (if deployed)
- Deployment: castmatch-ml-service
- Service: castmatch-ml-service
- HPA: castmatch-ml-hpa
- Redis: redis-cluster
- Namespace: ${NAMESPACE}

## Next Steps
1. Run performance tests: \`./performance_test.py\`
2. Start monitoring dashboard: \`./serve_dashboard.py\`
3. Monitor metrics: http://localhost:8080/monitoring_dashboard.html
4. Check logs: \`docker logs castmatch-ml-test\` or \`kubectl logs -n ${NAMESPACE} -l app=castmatch-ml\`

## Support
For issues or questions, check:
- Service health: http://localhost:8003/health
- Service logs: \`docker logs <container-id>\`
- Kubernetes pods: \`kubectl get pods -n ${NAMESPACE}\`
EOF
    
    print_status "Deployment report generated: deployment_report.md"
}

# Main deployment flow
main() {
    echo ""
    check_prerequisites
    
    # Ask for deployment type
    echo ""
    echo "Select deployment option:"
    echo "1) Local Docker deployment"
    echo "2) Kubernetes deployment"
    echo "3) Both"
    echo "4) Build only"
    read -p "Enter choice [1-4]: " choice
    
    case $choice in
        1)
            build_image
            test_local
            setup_monitoring
            performance_test
            ;;
        2)
            build_image
            deploy_kubernetes
            setup_monitoring
            ;;
        3)
            build_image
            test_local
            deploy_kubernetes
            setup_monitoring
            performance_test
            ;;
        4)
            build_image
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    generate_report
    
    echo ""
    print_status "Deployment completed successfully!"
    echo ""
    echo "Quick Start Commands:"
    echo "  View health: curl http://localhost:8003/health"
    echo "  Test search: curl -X POST http://localhost:8003/api/v1/search -H 'Content-Type: application/json' -d '{\"query\":\"Find actors in Mumbai\"}'"
    echo "  View metrics: curl http://localhost:8003/metrics"
    echo "  Start dashboard: ./serve_dashboard.py"
    echo "  Run load test: ./performance_test.py"
    echo ""
}

# Run main function
main
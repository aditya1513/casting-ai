#!/bin/bash

# CastMatch Blue-Green Deployment Script
# Provides zero-downtime deployments with automatic rollback

set -e

# Configuration
NAMESPACE="castmatch-production"
DEPLOYMENT_TIMEOUT=300
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
        log_error "Namespace ${NAMESPACE} does not exist"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Get current active deployment (blue or green)
get_active_deployment() {
    local service_selector=$(kubectl get service castmatch-backend -n ${NAMESPACE} -o jsonpath='{.spec.selector.version}')
    echo ${service_selector}
}

# Get inactive deployment (opposite of active)
get_inactive_deployment() {
    local active=$(get_active_deployment)
    if [ "${active}" == "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Update deployment image
update_deployment() {
    local deployment=$1
    local image=$2
    
    log_info "Updating ${deployment} deployment with image ${image}..."
    
    kubectl set image deployment/castmatch-backend-${deployment} \
        backend=${image} \
        -n ${NAMESPACE}
    
    # Wait for rollout to complete
    kubectl rollout status deployment/castmatch-backend-${deployment} \
        -n ${NAMESPACE} \
        --timeout=${DEPLOYMENT_TIMEOUT}s
    
    log_success "Deployment ${deployment} updated successfully"
}

# Scale deployment
scale_deployment() {
    local deployment=$1
    local replicas=$2
    
    log_info "Scaling ${deployment} to ${replicas} replicas..."
    
    kubectl scale deployment/castmatch-backend-${deployment} \
        --replicas=${replicas} \
        -n ${NAMESPACE}
    
    # Wait for scaling to complete
    kubectl wait --for=condition=ready pod \
        -l app=castmatch-backend,version=${deployment} \
        -n ${NAMESPACE} \
        --timeout=${DEPLOYMENT_TIMEOUT}s
    
    log_success "Deployment ${deployment} scaled to ${replicas} replicas"
}

# Health check
health_check() {
    local deployment=$1
    local retries=${HEALTH_CHECK_RETRIES}
    
    log_info "Running health checks for ${deployment}..."
    
    while [ ${retries} -gt 0 ]; do
        local ready_pods=$(kubectl get pods -l app=castmatch-backend,version=${deployment} \
            -n ${NAMESPACE} \
            -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' | wc -w)
        
        local total_pods=$(kubectl get pods -l app=castmatch-backend,version=${deployment} \
            -n ${NAMESPACE} \
            -o jsonpath='{.items[*].metadata.name}' | wc -w)
        
        if [ ${ready_pods} -eq ${total_pods} ] && [ ${total_pods} -gt 0 ]; then
            log_success "All ${total_pods} pods are healthy"
            return 0
        fi
        
        log_warning "Health check: ${ready_pods}/${total_pods} pods ready. Retrying in ${HEALTH_CHECK_INTERVAL}s..."
        sleep ${HEALTH_CHECK_INTERVAL}
        retries=$((retries - 1))
    done
    
    log_error "Health check failed after ${HEALTH_CHECK_RETRIES} attempts"
    return 1
}

# Run smoke tests
smoke_test() {
    local deployment=$1
    
    log_info "Running smoke tests for ${deployment}..."
    
    # Get pod IP for direct testing
    local pod_ip=$(kubectl get pods -l app=castmatch-backend,version=${deployment} \
        -n ${NAMESPACE} \
        -o jsonpath='{.items[0].status.podIP}')
    
    if [ -z "${pod_ip}" ]; then
        log_error "Could not get pod IP for smoke testing"
        return 1
    fi
    
    # Test health endpoint
    kubectl run smoke-test-${RANDOM} \
        --rm -i --restart=Never \
        --image=curlimages/curl:latest \
        -n ${NAMESPACE} \
        -- curl -f http://${pod_ip}:3000/health/ready
    
    if [ $? -eq 0 ]; then
        log_success "Smoke tests passed"
        return 0
    else
        log_error "Smoke tests failed"
        return 1
    fi
}

# Switch traffic to new deployment
switch_traffic() {
    local new_deployment=$1
    
    log_info "Switching traffic to ${new_deployment} deployment..."
    
    kubectl patch service castmatch-backend \
        -n ${NAMESPACE} \
        -p '{"spec":{"selector":{"version":"'${new_deployment}'"}}}'
    
    log_success "Traffic switched to ${new_deployment}"
}

# Rollback deployment
rollback() {
    local original_deployment=$1
    
    log_error "Deployment failed, rolling back to ${original_deployment}..."
    
    # Switch traffic back
    switch_traffic ${original_deployment}
    
    # Scale down failed deployment
    local failed_deployment=$(get_inactive_deployment)
    scale_deployment ${failed_deployment} 0
    
    log_success "Rollback completed"
}

# Main deployment flow
deploy() {
    local new_image=$1
    
    if [ -z "${new_image}" ]; then
        log_error "Image not specified. Usage: $0 <image:tag>"
        exit 1
    fi
    
    check_prerequisites
    
    local active_deployment=$(get_active_deployment)
    local inactive_deployment=$(get_inactive_deployment)
    
    log_info "Current active deployment: ${active_deployment}"
    log_info "Deploying to: ${inactive_deployment}"
    
    # Update inactive deployment with new image
    update_deployment ${inactive_deployment} ${new_image}
    
    # Scale up inactive deployment
    scale_deployment ${inactive_deployment} 6
    
    # Health check
    if ! health_check ${inactive_deployment}; then
        rollback ${active_deployment}
        exit 1
    fi
    
    # Run smoke tests
    if ! smoke_test ${inactive_deployment}; then
        rollback ${active_deployment}
        exit 1
    fi
    
    # Canary deployment (optional - send 10% traffic for testing)
    log_info "Starting canary deployment phase..."
    # This would require Istio or similar service mesh for traffic splitting
    # For now, we'll proceed with full switch
    
    # Switch traffic to new deployment
    switch_traffic ${inactive_deployment}
    
    # Monitor for 60 seconds
    log_info "Monitoring new deployment for 60 seconds..."
    sleep 60
    
    # Final health check
    if ! health_check ${inactive_deployment}; then
        rollback ${active_deployment}
        exit 1
    fi
    
    # Scale down old deployment
    log_info "Scaling down ${active_deployment} deployment..."
    scale_deployment ${active_deployment} 0
    
    log_success "Blue-Green deployment completed successfully!"
    log_success "New active deployment: ${inactive_deployment}"
    
    # Generate deployment report
    generate_report ${inactive_deployment} ${new_image}
}

# Generate deployment report
generate_report() {
    local deployment=$1
    local image=$2
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    cat << EOF

========================================
DEPLOYMENT REPORT
========================================
Timestamp: ${timestamp}
Deployment: ${deployment}
Image: ${image}
Namespace: ${NAMESPACE}
Status: SUCCESS

Pods Status:
$(kubectl get pods -l app=castmatch-backend,version=${deployment} -n ${NAMESPACE})

Service Endpoints:
$(kubectl get endpoints castmatch-backend -n ${NAMESPACE})

Recent Events:
$(kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -10)
========================================

EOF
}

# Execute deployment
deploy $1
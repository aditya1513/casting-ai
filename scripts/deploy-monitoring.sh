#!/bin/bash

# CastMatch Production Monitoring Deployment Script
# Deploys Prometheus, Grafana, Jaeger, and related monitoring infrastructure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="castmatch-production"
MONITORING_NAMESPACE="castmatch-monitoring"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    for tool in kubectl helm; do
        if ! command -v "${tool}" &> /dev/null; then
            log_error "Required tool '${tool}' is not installed"
            exit 1
        fi
    done
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

create_namespaces() {
    log_info "Creating namespaces..."
    
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace "${MONITORING_NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Namespaces created"
}

install_prometheus_operator() {
    log_info "Installing Prometheus Operator..."
    
    # Add Prometheus community Helm repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Install kube-prometheus-stack
    helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
        --namespace "${MONITORING_NAMESPACE}" \
        --values - <<EOF
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp2
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
    ruleSelector:
      matchLabels:
        prometheus: production
    serviceMonitorSelector:
      matchLabels:
        app: castmatch
    additionalScrapeConfigs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__

grafana:
  enabled: true
  adminPassword: "castmatch-admin-2024"
  persistence:
    enabled: true
    size: 10Gi
    storageClassName: gp2
  grafana.ini:
    server:
      root_url: "https://grafana.castmatch.com"
    security:
      allow_embedding: true
    auth:
      disable_login_form: false
    auth.anonymous:
      enabled: false
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'castmatch'
        orgId: 1
        folder: 'CastMatch'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/castmatch

alertmanager:
  enabled: true
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: gp2
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
  config:
    global:
      smtp_smarthost: 'smtp.sendgrid.net:587'
      smtp_from: 'alerts@castmatch.com'
      smtp_auth_username: 'apikey'
      smtp_auth_password: '${SENDGRID_API_KEY}'
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'default'
      routes:
      - match:
          severity: critical
        receiver: 'critical'
        repeat_interval: 15m
      - match:
          severity: warning
        receiver: 'warning'
        repeat_interval: 1h
    receivers:
    - name: 'default'
      slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'CastMatch Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    - name: 'critical'
      slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#critical-alerts'
        title: '🚨 CRITICAL: CastMatch Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'
      pagerduty_configs:
      - routing_key: '${PAGERDUTY_ROUTING_KEY}'
        description: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    - name: 'warning'
      slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: '⚠️ WARNING: CastMatch Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

nodeExporter:
  enabled: true

kubeStateMetrics:
  enabled: true
EOF
    
    log_success "Prometheus Operator installed"
}

deploy_jaeger() {
    log_info "Deploying Jaeger..."
    
    # Deploy Jaeger using the configuration
    kubectl apply -f "${SCRIPT_DIR}/../monitoring/jaeger-config.yaml"
    
    # Wait for Jaeger to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/jaeger-query -n "${NAMESPACE}"
    
    log_success "Jaeger deployed"
}

apply_prometheus_rules() {
    log_info "Applying Prometheus alerting rules..."
    
    kubectl apply -f "${SCRIPT_DIR}/../monitoring/prometheus-rules.yaml"
    
    log_success "Prometheus rules applied"
}

configure_grafana_dashboards() {
    log_info "Configuring Grafana dashboards..."
    
    # Wait for Grafana to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus-stack-grafana -n "${MONITORING_NAMESPACE}"
    
    # Create CastMatch dashboard
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: castmatch-dashboards
  namespace: ${MONITORING_NAMESPACE}
  labels:
    grafana_dashboard: "1"
data:
  castmatch-overview.json: |
    {
      "dashboard": {
        "id": null,
        "title": "CastMatch Production Overview",
        "tags": ["castmatch", "production"],
        "timezone": "UTC",
        "refresh": "30s",
        "time": {"from": "now-1h", "to": "now"},
        "panels": [
          {
            "id": 1,
            "title": "Request Rate",
            "type": "stat",
            "targets": [{"expr": "sum(rate(http_requests_total[5m]))", "legendFormat": "Requests/sec"}],
            "fieldConfig": {"defaults": {"unit": "reqps"}},
            "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0}
          },
          {
            "id": 2,
            "title": "Error Rate",
            "type": "stat",
            "targets": [{"expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100", "legendFormat": "Error Rate %"}],
            "fieldConfig": {"defaults": {"unit": "percent"}},
            "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0}
          },
          {
            "id": 3,
            "title": "Response Time (95th percentile)",
            "type": "stat",
            "targets": [{"expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))", "legendFormat": "95th percentile"}],
            "fieldConfig": {"defaults": {"unit": "s"}},
            "gridPos": {"h": 4, "w": 6, "x": 12, "y": 0}
          },
          {
            "id": 4,
            "title": "Pod Status",
            "type": "table",
            "targets": [{"expr": "kube_pod_status_phase{namespace=\"castmatch-production\"}", "legendFormat": "{{pod}} - {{phase}}"}],
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4}
          }
        ]
      }
    }
EOF
    
    log_success "Grafana dashboards configured"
}

create_service_monitors() {
    log_info "Creating ServiceMonitors..."
    
    # Apply ServiceMonitors from the prometheus-rules.yaml
    kubectl apply -f "${SCRIPT_DIR}/../monitoring/prometheus-rules.yaml"
    
    log_success "ServiceMonitors created"
}

setup_ingress() {
    log_info "Setting up ingress for monitoring services..."
    
    # Grafana Ingress
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: ${MONITORING_NAMESPACE}
  annotations:
    kubernetes.io/ingress.class: "alb"
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789012:certificate/your-cert-arn"
spec:
  rules:
  - host: grafana.castmatch.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-stack-grafana
            port:
              number: 80
  tls:
  - hosts:
    - grafana.castmatch.com
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prometheus-ingress
  namespace: ${MONITORING_NAMESPACE}
  annotations:
    kubernetes.io/ingress.class: "alb"
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  rules:
  - host: prometheus.castmatch.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-stack-kube-prom-prometheus
            port:
              number: 9090
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jaeger-ingress
  namespace: ${NAMESPACE}
  annotations:
    kubernetes.io/ingress.class: "alb"
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  rules:
  - host: jaeger.castmatch.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: jaeger-query
            port:
              number: 16686
EOF
    
    log_success "Ingress configured"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check Prometheus
    kubectl get pods -n "${MONITORING_NAMESPACE}" -l app.kubernetes.io/name=prometheus
    
    # Check Grafana
    kubectl get pods -n "${MONITORING_NAMESPACE}" -l app.kubernetes.io/name=grafana
    
    # Check Jaeger
    kubectl get pods -n "${NAMESPACE}" -l app=jaeger
    
    # Check ServiceMonitors
    kubectl get servicemonitors -n "${NAMESPACE}"
    
    # Check PrometheusRules
    kubectl get prometheusrules -n "${NAMESPACE}"
    
    log_success "Deployment verification completed"
}

print_access_info() {
    log_info "Monitoring Services Access Information:"
    echo ""
    echo "Grafana:"
    echo "  URL: https://grafana.castmatch.com"
    echo "  Username: admin"
    echo "  Password: castmatch-admin-2024"
    echo ""
    echo "Prometheus:"
    echo "  URL: https://prometheus.castmatch.com"
    echo ""
    echo "Jaeger:"
    echo "  URL: https://jaeger.castmatch.com"
    echo ""
    echo "Port-forward commands (if ingress is not available):"
    echo "  Grafana: kubectl port-forward -n ${MONITORING_NAMESPACE} svc/prometheus-stack-grafana 3000:80"
    echo "  Prometheus: kubectl port-forward -n ${MONITORING_NAMESPACE} svc/prometheus-stack-kube-prom-prometheus 9090:9090"
    echo "  Jaeger: kubectl port-forward -n ${NAMESPACE} svc/jaeger-query 16686:16686"
}

main() {
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            create_namespaces
            install_prometheus_operator
            deploy_jaeger
            apply_prometheus_rules
            configure_grafana_dashboards
            create_service_monitors
            setup_ingress
            verify_deployment
            print_access_info
            ;;
        
        update-rules)
            apply_prometheus_rules
            ;;
        
        update-dashboards)
            configure_grafana_dashboards
            ;;
        
        verify)
            verify_deployment
            ;;
        
        info)
            print_access_info
            ;;
        
        *)
            echo "Usage: $0 {deploy|update-rules|update-dashboards|verify|info}"
            exit 1
            ;;
    esac
}

main "$@"
#!/usr/bin/env python3
"""
Production Health Checks for CastMatch ML Service
Comprehensive health monitoring with readiness/liveness probes and Prometheus metrics
"""

import asyncio
import time
import psutil
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import httpx
from loguru import logger


class HealthStatus(Enum):
    """Health check status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Individual health check result."""
    check_name: str
    status: HealthStatus
    response_time_ms: float
    message: str
    details: Dict[str, Any] = None
    timestamp: float = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()


class ProductionHealthMonitor:
    """Comprehensive production health monitoring system."""
    
    def __init__(self, service_url: str = "http://localhost:8002"):
        self.service_url = service_url
        self.health_history: List[HealthCheckResult] = []
        
        # Health check thresholds
        self.thresholds = {
            "response_time_ms": 1000,      # Max 1s response time
            "memory_percent": 85,          # Max 85% memory usage  
            "cpu_percent": 80,             # Max 80% CPU usage
            "disk_percent": 90,            # Max 90% disk usage
            "error_rate_percent": 5,       # Max 5% error rate
            "cache_hit_rate_percent": 70   # Min 70% cache hit rate
        }
        
        logger.info("Production health monitor initialized")
    
    async def check_api_endpoint(self, endpoint: str, timeout: float = 5.0) -> HealthCheckResult:
        """Check API endpoint health."""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(f"{self.service_url}/{endpoint}")
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    status = HealthStatus.HEALTHY
                    message = f"Endpoint /{endpoint} responding normally"
                elif response.status_code < 500:
                    status = HealthStatus.DEGRADED
                    message = f"Endpoint /{endpoint} returned {response.status_code}"
                else:
                    status = HealthStatus.UNHEALTHY
                    message = f"Endpoint /{endpoint} server error {response.status_code}"
                
                details = {
                    "status_code": response.status_code,
                    "response_size_bytes": len(response.content),
                    "headers": dict(response.headers)
                }
                
                return HealthCheckResult(
                    check_name=f"api_{endpoint}",
                    status=status,
                    response_time_ms=response_time,
                    message=message,
                    details=details
                )
                
        except asyncio.TimeoutError:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                check_name=f"api_{endpoint}",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                message=f"Endpoint /{endpoint} timeout after {timeout}s"
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                check_name=f"api_{endpoint}",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                message=f"Endpoint /{endpoint} error: {str(e)}"
            )
    
    def check_system_resources(self) -> HealthCheckResult:
        """Check system resource utilization."""
        start_time = time.time()
        
        try:
            # Get system metrics
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)
            disk = psutil.disk_usage('/')
            
            # Process-specific metrics
            process = psutil.Process()
            process_memory = process.memory_info()
            process_cpu = process.cpu_percent()
            
            details = {
                "system": {
                    "memory_percent": memory.percent,
                    "memory_available_mb": memory.available / 1024 / 1024,
                    "cpu_percent": cpu_percent,
                    "disk_percent": (disk.used / disk.total) * 100
                },
                "process": {
                    "memory_mb": process_memory.rss / 1024 / 1024,
                    "cpu_percent": process_cpu,
                    "num_threads": process.num_threads()
                }
            }
            
            # Determine status
            status = HealthStatus.HEALTHY
            issues = []
            
            if memory.percent > self.thresholds["memory_percent"]:
                status = HealthStatus.DEGRADED
                issues.append(f"High memory usage: {memory.percent:.1f}%")
            
            if cpu_percent > self.thresholds["cpu_percent"]:
                status = HealthStatus.DEGRADED
                issues.append(f"High CPU usage: {cpu_percent:.1f}%")
            
            if (disk.used / disk.total) * 100 > self.thresholds["disk_percent"]:
                status = HealthStatus.DEGRADED
                issues.append(f"High disk usage: {(disk.used / disk.total) * 100:.1f}%")
            
            message = "System resources healthy" if status == HealthStatus.HEALTHY else f"Resource issues: {'; '.join(issues)}"
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheckResult(
                check_name="system_resources",
                status=status,
                response_time_ms=response_time,
                message=message,
                details=details
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                check_name="system_resources",
                status=HealthStatus.UNKNOWN,
                response_time_ms=response_time,
                message=f"Failed to check system resources: {str(e)}"
            )
    
    async def check_ml_service_performance(self) -> HealthCheckResult:
        """Check ML service specific performance metrics."""
        start_time = time.time()
        
        try:
            # Test a simple ML request
            test_payload = {
                "message": "Find actors in Mumbai for health check",
                "user_id": "health_check",
                "session_id": "health_check"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.service_url}/chat",
                    json=test_payload
                )
                
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Analyze response quality
                    has_talents = len(data.get("talents", [])) > 0
                    has_suggestions = len(data.get("suggestions", [])) > 0
                    performance_data = data.get("performance", {})
                    
                    details = {
                        "response_time_ms": response_time,
                        "talents_returned": len(data.get("talents", [])),
                        "suggestions_returned": len(data.get("suggestions", [])),
                        "ml_performance": performance_data
                    }
                    
                    # Determine status based on performance
                    if response_time > self.thresholds["response_time_ms"]:
                        status = HealthStatus.DEGRADED
                        message = f"ML service slow: {response_time:.1f}ms response time"
                    elif not (has_talents or has_suggestions):
                        status = HealthStatus.DEGRADED
                        message = "ML service not returning expected results"
                    else:
                        status = HealthStatus.HEALTHY
                        message = f"ML service performing well: {response_time:.1f}ms response time"
                    
                    return HealthCheckResult(
                        check_name="ml_service_performance",
                        status=status,
                        response_time_ms=response_time,
                        message=message,
                        details=details
                    )
                else:
                    return HealthCheckResult(
                        check_name="ml_service_performance",
                        status=HealthStatus.UNHEALTHY,
                        response_time_ms=response_time,
                        message=f"ML service returned HTTP {response.status_code}"
                    )
                    
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                check_name="ml_service_performance",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                message=f"ML service check failed: {str(e)}"
            )
    
    async def check_service_dependencies(self) -> HealthCheckResult:
        """Check external service dependencies."""
        start_time = time.time()
        
        # For this implementation, we'll check basic network connectivity
        # In production, this would check databases, Redis, external APIs, etc.
        
        dependencies_status = []
        
        try:
            # Check basic internet connectivity (as proxy for external services)
            async with httpx.AsyncClient(timeout=5.0) as client:
                try:
                    await client.get("https://www.google.com", timeout=3.0)
                    dependencies_status.append("internet_connectivity: healthy")
                except:
                    dependencies_status.append("internet_connectivity: unhealthy")
            
            # In production, you would check:
            # - Database connections
            # - Redis/cache connectivity  
            # - External API services
            # - Message queue systems
            
            response_time = (time.time() - start_time) * 1000
            
            unhealthy_deps = [dep for dep in dependencies_status if "unhealthy" in dep]
            
            if not unhealthy_deps:
                status = HealthStatus.HEALTHY
                message = "All dependencies healthy"
            else:
                status = HealthStatus.DEGRADED
                message = f"Dependency issues: {'; '.join(unhealthy_deps)}"
            
            return HealthCheckResult(
                check_name="service_dependencies",
                status=status,
                response_time_ms=response_time,
                message=message,
                details={"dependencies": dependencies_status}
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                check_name="service_dependencies",
                status=HealthStatus.UNKNOWN,
                response_time_ms=response_time,
                message=f"Dependency check failed: {str(e)}"
            )
    
    async def run_comprehensive_health_check(self) -> Dict[str, Any]:
        """Run all health checks and return comprehensive status."""
        logger.info("Running comprehensive health check")
        
        start_time = time.time()
        
        # Run all health checks concurrently
        checks = await asyncio.gather(
            self.check_api_endpoint("health"),
            self.check_api_endpoint(""),  # Root endpoint
            self.check_ml_service_performance(),
            self.check_service_dependencies(),
            asyncio.create_task(asyncio.to_thread(self.check_system_resources)),
            return_exceptions=True
        )
        
        # Process results
        health_results = []
        for check in checks:
            if isinstance(check, HealthCheckResult):
                health_results.append(check)
                self.health_history.append(check)
            else:
                # Exception occurred
                logger.error(f"Health check exception: {check}")
                health_results.append(HealthCheckResult(
                    check_name="unknown",
                    status=HealthStatus.UNKNOWN,
                    response_time_ms=0,
                    message=f"Health check failed: {str(check)}"
                ))
        
        # Keep only recent history (last 100 checks)
        self.health_history = self.health_history[-100:]
        
        # Determine overall health
        total_time = time.time() - start_time
        
        healthy_checks = sum(1 for check in health_results if check.status == HealthStatus.HEALTHY)
        degraded_checks = sum(1 for check in health_results if check.status == HealthStatus.DEGRADED)
        unhealthy_checks = sum(1 for check in health_results if check.status == HealthStatus.UNHEALTHY)
        
        if unhealthy_checks > 0:
            overall_status = HealthStatus.UNHEALTHY
            overall_message = f"Service unhealthy: {unhealthy_checks} critical issues"
        elif degraded_checks > 0:
            overall_status = HealthStatus.DEGRADED
            overall_message = f"Service degraded: {degraded_checks} performance issues"
        else:
            overall_status = HealthStatus.HEALTHY
            overall_message = "All systems healthy"
        
        return {
            "overall_status": overall_status.value,
            "overall_message": overall_message,
            "check_summary": {
                "total_checks": len(health_results),
                "healthy": healthy_checks,
                "degraded": degraded_checks,
                "unhealthy": unhealthy_checks,
                "unknown": len(health_results) - healthy_checks - degraded_checks - unhealthy_checks
            },
            "individual_checks": [asdict(check) for check in health_results],
            "total_check_time_ms": round(total_time * 1000, 2),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "readiness": overall_status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED],
            "liveness": overall_status != HealthStatus.UNHEALTHY
        }
    
    def get_prometheus_metrics(self) -> str:
        """Generate Prometheus-format metrics."""
        if not self.health_history:
            return "# No health check data available\n"
        
        latest_checks = {}
        for check in reversed(self.health_history):
            if check.check_name not in latest_checks:
                latest_checks[check.check_name] = check
        
        metrics = []
        
        # Health status metrics (0=unknown, 1=healthy, 2=degraded, 3=unhealthy)
        status_map = {
            HealthStatus.UNKNOWN: 0,
            HealthStatus.HEALTHY: 1,
            HealthStatus.DEGRADED: 2,
            HealthStatus.UNHEALTHY: 3
        }
        
        metrics.append("# HELP castmatch_health_status Health check status (0=unknown, 1=healthy, 2=degraded, 3=unhealthy)")
        metrics.append("# TYPE castmatch_health_status gauge")
        
        for check_name, check in latest_checks.items():
            status_value = status_map[check.status]
            metrics.append(f'castmatch_health_status{{check="{check_name}"}} {status_value}')
        
        # Response time metrics
        metrics.append("# HELP castmatch_health_response_time_ms Health check response time in milliseconds")
        metrics.append("# TYPE castmatch_health_response_time_ms gauge")
        
        for check_name, check in latest_checks.items():
            metrics.append(f'castmatch_health_response_time_ms{{check="{check_name}"}} {check.response_time_ms}')
        
        # Overall health metric
        overall_healthy = all(check.status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED] for check in latest_checks.values())
        metrics.append("# HELP castmatch_service_healthy Overall service health (1=healthy, 0=unhealthy)")
        metrics.append("# TYPE castmatch_service_healthy gauge")
        metrics.append(f"castmatch_service_healthy {1 if overall_healthy else 0}")
        
        return "\n".join(metrics) + "\n"


# Global health monitor
health_monitor = ProductionHealthMonitor()


async def main():
    """Demo production health monitoring."""
    print("=== CastMatch Production Health Checks Demo ===")
    
    # Run comprehensive health check
    print("\n1. Running comprehensive health check...")
    health_result = await health_monitor.run_comprehensive_health_check()
    
    print(f"Overall Status: {health_result['overall_status']}")
    print(f"Message: {health_result['overall_message']}")
    print(f"Readiness: {health_result['readiness']}")
    print(f"Liveness: {health_result['liveness']}")
    
    print("\n2. Individual Check Results:")
    for check in health_result['individual_checks']:
        print(f"  {check['check_name']}: {check['status']} ({check['response_time_ms']:.1f}ms)")
    
    print("\n3. Prometheus Metrics:")
    print(health_monitor.get_prometheus_metrics())
    
    return health_result


if __name__ == "__main__":
    asyncio.run(main())
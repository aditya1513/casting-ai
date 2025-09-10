"""Performance monitoring and metrics collection service."""

import time
import asyncio
import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import json
from loguru import logger
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import threading
import gc


@dataclass
class PerformanceMetric:
    """Performance metric data structure."""
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str] = None
    unit: str = "ms"


class MetricsCollector:
    """High-performance metrics collector with Prometheus integration."""
    
    def __init__(self, max_history: int = 1000):
        """Initialize metrics collector."""
        self.max_history = max_history
        self.metrics_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_history))
        
        # Prometheus metrics
        self.request_counter = Counter('ai_service_requests_total', 'Total requests', ['endpoint', 'status'])
        self.response_time_histogram = Histogram('ai_service_response_time_seconds', 'Response time', ['endpoint'])
        self.cache_hit_counter = Counter('ai_service_cache_hits_total', 'Cache hits', ['cache_type'])
        self.cache_miss_counter = Counter('ai_service_cache_misses_total', 'Cache misses', ['cache_type'])
        
        # System metrics
        self.memory_gauge = Gauge('ai_service_memory_bytes', 'Memory usage in bytes')
        self.cpu_gauge = Gauge('ai_service_cpu_percent', 'CPU usage percentage')
        self.vector_count_gauge = Gauge('ai_service_vectors_total', 'Total vectors indexed')
        self.active_connections_gauge = Gauge('ai_service_active_connections', 'Active connections')
        
        # Performance tracking
        self.start_time = time.time()
        self.request_times: Dict[str, float] = {}
        
        # Background metrics collection
        self._collection_task = None
        self._stop_collection = False
        
        # Thread lock for metrics updates
        self._lock = threading.Lock()
        
    async def start_background_collection(self, interval: float = 30.0):
        """Start background metrics collection."""
        self._collection_task = asyncio.create_task(self._collect_system_metrics_loop(interval))
        logger.info(f"Started background metrics collection (interval: {interval}s)")
        
    async def stop_background_collection(self):
        """Stop background metrics collection."""
        self._stop_collection = True
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped background metrics collection")
        
    async def _collect_system_metrics_loop(self, interval: float):
        """Background loop for collecting system metrics."""
        while not self._stop_collection:
            try:
                await self._collect_system_metrics()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background metrics collection: {e}")
                await asyncio.sleep(interval)
                
    async def _collect_system_metrics(self):
        """Collect system-level metrics."""
        try:
            # Memory metrics
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            
            self.memory_gauge.set(memory_info.rss)
            self.record_metric("system.memory_mb", memory_mb, tags={"type": "rss"})
            self.record_metric("system.memory_mb", memory_info.vms / 1024 / 1024, tags={"type": "vms"})
            
            # CPU metrics
            cpu_percent = process.cpu_percent()
            self.cpu_gauge.set(cpu_percent)
            self.record_metric("system.cpu_percent", cpu_percent)
            
            # Garbage collection metrics
            gc_stats = gc.get_stats()
            if gc_stats:
                for i, stats in enumerate(gc_stats):
                    self.record_metric(f"gc.generation_{i}.collections", stats['collections'])
                    self.record_metric(f"gc.generation_{i}.collected", stats['collected'])
                    self.record_metric(f"gc.generation_{i}.uncollectable", stats['uncollectable'])
                    
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            
    def record_metric(self, name: str, value: float, tags: Optional[Dict[str, str]] = None, unit: str = "ms"):
        """Record a performance metric."""
        metric = PerformanceMetric(
            name=name,
            value=value,
            timestamp=datetime.utcnow(),
            tags=tags or {},
            unit=unit
        )
        
        with self._lock:
            self.metrics_history[name].append(metric)
        
    def start_request_timer(self, request_id: str) -> str:
        """Start timing a request."""
        self.request_times[request_id] = time.time()
        return request_id
        
    def end_request_timer(self, request_id: str, endpoint: str = "unknown", status: str = "success") -> float:
        """End timing a request and record metrics."""
        start_time = self.request_times.pop(request_id, time.time())
        duration = time.time() - start_time
        
        # Record Prometheus metrics
        self.request_counter.labels(endpoint=endpoint, status=status).inc()
        self.response_time_histogram.labels(endpoint=endpoint).observe(duration)
        
        # Record custom metric
        self.record_metric(f"request.{endpoint}.response_time", duration * 1000, unit="ms")
        
        return duration
        
    def record_cache_hit(self, cache_type: str):
        """Record a cache hit."""
        self.cache_hit_counter.labels(cache_type=cache_type).inc()
        self.record_metric(f"cache.{cache_type}.hits", 1, unit="count")
        
    def record_cache_miss(self, cache_type: str):
        """Record a cache miss."""
        self.cache_miss_counter.labels(cache_type=cache_type).inc()
        self.record_metric(f"cache.{cache_type}.misses", 1, unit="count")
        
    def update_vector_count(self, count: int):
        """Update vector count metric."""
        self.vector_count_gauge.set(count)
        self.record_metric("vectors.total_count", count, unit="count")
        
    def update_active_connections(self, count: int):
        """Update active connections metric."""
        self.active_connections_gauge.set(count)
        self.record_metric("connections.active", count, unit="count")
        
    def get_metric_summary(self, name: str, window_minutes: int = 5) -> Dict[str, Any]:
        """Get summary statistics for a metric over a time window."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)
        
        with self._lock:
            recent_metrics = [
                m for m in self.metrics_history[name] 
                if m.timestamp >= cutoff_time
            ]
        
        if not recent_metrics:
            return {
                "name": name,
                "count": 0,
                "window_minutes": window_minutes
            }
            
        values = [m.value for m in recent_metrics]
        
        return {
            "name": name,
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "p50": sorted(values)[len(values) // 2],
            "p95": sorted(values)[int(len(values) * 0.95)] if len(values) > 1 else values[0],
            "p99": sorted(values)[int(len(values) * 0.99)] if len(values) > 1 else values[0],
            "unit": recent_metrics[0].unit,
            "window_minutes": window_minutes
        }
        
    def get_all_metrics_summary(self, window_minutes: int = 5) -> Dict[str, Any]:
        """Get summary for all collected metrics."""
        summaries = {}
        
        with self._lock:
            metric_names = list(self.metrics_history.keys())
            
        for name in metric_names:
            summaries[name] = self.get_metric_summary(name, window_minutes)
            
        return summaries
        
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report."""
        try:
            uptime = time.time() - self.start_time
            
            # Get system info
            process = psutil.Process()
            memory_info = process.memory_info()
            
            # Calculate cache statistics
            cache_metrics = {}
            for cache_type in ['embedding', 'model', 'conversation', 'vector']:
                hits = sum(1 for m in self.metrics_history[f"cache.{cache_type}.hits"] 
                          if (datetime.utcnow() - m.timestamp).total_seconds() < 300)  # 5 min window
                misses = sum(1 for m in self.metrics_history[f"cache.{cache_type}.misses"] 
                           if (datetime.utcnow() - m.timestamp).total_seconds() < 300)
                
                total = hits + misses
                hit_rate = (hits / total * 100) if total > 0 else 0
                
                cache_metrics[cache_type] = {
                    "hits": hits,
                    "misses": misses,
                    "hit_rate_percent": round(hit_rate, 2)
                }
            
            # Get recent response times
            response_time_summary = self.get_metric_summary("request.chat.response_time", window_minutes=5)
            
            return {
                "service": {
                    "uptime_seconds": round(uptime, 2),
                    "uptime_human": str(timedelta(seconds=int(uptime))),
                    "status": "healthy"
                },
                "performance": {
                    "response_times": response_time_summary,
                    "cache_performance": cache_metrics,
                    "total_metrics_collected": sum(len(metrics) for metrics in self.metrics_history.values())
                },
                "system": {
                    "memory_mb": round(memory_info.rss / 1024 / 1024, 2),
                    "memory_percent": round(process.memory_percent(), 2),
                    "cpu_percent": round(process.cpu_percent(), 2),
                    "threads": process.num_threads(),
                    "open_files": len(process.open_files())
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
            
    def export_prometheus_metrics(self) -> str:
        """Export metrics in Prometheus format."""
        return generate_latest()
        
    def get_prometheus_content_type(self) -> str:
        """Get Prometheus content type."""
        return CONTENT_TYPE_LATEST
        
    def clear_metrics(self, older_than_minutes: int = 60):
        """Clear old metrics to prevent memory buildup."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=older_than_minutes)
        cleared_count = 0
        
        with self._lock:
            for name, metrics in self.metrics_history.items():
                original_len = len(metrics)
                # Filter out old metrics
                while metrics and metrics[0].timestamp < cutoff_time:
                    metrics.popleft()
                cleared_count += original_len - len(metrics)
                
        if cleared_count > 0:
            logger.debug(f"Cleared {cleared_count} old metrics")
            
        return cleared_count
        
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check and return status."""
        try:
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            cpu_percent = process.cpu_percent()
            
            # Check if metrics collection is working
            recent_metrics = sum(
                1 for metrics in self.metrics_history.values()
                for m in metrics
                if (datetime.utcnow() - m.timestamp).total_seconds() < 300
            )
            
            # Determine health status
            status = "healthy"
            issues = []
            
            if memory_mb > 1024:  # > 1GB
                issues.append("High memory usage")
                
            if cpu_percent > 80:
                issues.append("High CPU usage")
                
            if recent_metrics == 0:
                issues.append("No recent metrics")
                status = "warning"
                
            if len(issues) > 2:
                status = "unhealthy"
                
            return {
                "status": status,
                "issues": issues,
                "metrics": {
                    "memory_mb": round(memory_mb, 2),
                    "cpu_percent": round(cpu_percent, 2),
                    "recent_metrics_count": recent_metrics,
                    "total_metrics": sum(len(m) for m in self.metrics_history.values())
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }


# Create global metrics collector
metrics_collector = MetricsCollector()


class PerformanceMonitor:
    """Context manager for monitoring performance."""
    
    def __init__(self, name: str, endpoint: str = "unknown"):
        self.name = name
        self.endpoint = endpoint
        self.request_id = None
        self.start_time = None
        
    def __enter__(self):
        self.request_id = f"{self.name}_{int(time.time() * 1000000)}"
        self.start_time = time.time()
        metrics_collector.start_request_timer(self.request_id)
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        status = "error" if exc_type else "success"
        duration = metrics_collector.end_request_timer(self.request_id, self.endpoint, status)
        
        # Log performance if it's slow
        if duration > 2.0:  # Log requests slower than 2 seconds
            logger.warning(f"Slow request: {self.endpoint} took {duration:.2f}s")


# Async context manager
class AsyncPerformanceMonitor:
    """Async context manager for monitoring performance."""
    
    def __init__(self, name: str, endpoint: str = "unknown"):
        self.name = name
        self.endpoint = endpoint
        self.request_id = None
        self.start_time = None
        
    async def __aenter__(self):
        self.request_id = f"{self.name}_{int(time.time() * 1000000)}"
        self.start_time = time.time()
        metrics_collector.start_request_timer(self.request_id)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        status = "error" if exc_type else "success"
        duration = metrics_collector.end_request_timer(self.request_id, self.endpoint, status)
        
        # Log performance if it's slow
        if duration > 2.0:  # Log requests slower than 2 seconds
            logger.warning(f"Slow async request: {self.endpoint} took {duration:.2f}s")
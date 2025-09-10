#!/usr/bin/env python3
"""
Model Drift Detection System for CastMatch ML Service
Monitors model performance degradation and triggers retraining alerts
"""

import asyncio
import time
import json
import statistics
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from loguru import logger


class DriftSeverity(Enum):
    """Drift severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ModelMetrics:
    """Model performance metrics snapshot."""
    timestamp: float
    model_version: str
    accuracy_score: float
    precision: float
    recall: float
    f1_score: float
    response_time_ms: float
    throughput_rps: float
    error_rate: float
    user_satisfaction: float
    metadata: Dict[str, Any] = None


@dataclass
class DriftAlert:
    """Model drift alert."""
    timestamp: float
    model_version: str
    metric_name: str
    baseline_value: float
    current_value: float
    drift_magnitude: float
    severity: DriftSeverity
    recommendation: str
    alert_id: str


class ModelDriftDetector:
    """Advanced model drift detection and monitoring system."""
    
    def __init__(self, baseline_window_hours: int = 24, drift_threshold: float = 0.05):
        self.baseline_window_hours = baseline_window_hours
        self.drift_threshold = drift_threshold
        
        # Storage for metrics history
        self.metrics_history: List[ModelMetrics] = []
        self.baseline_metrics: Optional[ModelMetrics] = None
        self.drift_alerts: List[DriftAlert] = []
        
        # Drift detection configuration
        self.critical_metrics = {
            "accuracy_score": {"threshold": 0.03, "direction": "decrease"},
            "response_time_ms": {"threshold": 0.15, "direction": "increase"},
            "error_rate": {"threshold": 0.02, "direction": "increase"},
            "user_satisfaction": {"threshold": 0.05, "direction": "decrease"}
        }
        
        # Alert suppression (avoid spam)
        self.alert_cooldown_hours = 2
        self.last_alert_time: Dict[str, float] = {}
        
        logger.info("Model drift detector initialized")
    
    def record_metrics(self, metrics: ModelMetrics):
        """Record new model metrics."""
        self.metrics_history.append(metrics)
        
        # Keep only recent metrics (last 7 days)
        cutoff_time = time.time() - (7 * 24 * 3600)
        self.metrics_history = [m for m in self.metrics_history if m.timestamp > cutoff_time]
        
        # Update baseline if needed
        if self.baseline_metrics is None:
            self.baseline_metrics = metrics
            logger.info(f"Baseline metrics established for model {metrics.model_version}")
        
        # Check for drift
        self._check_for_drift(metrics)
    
    def _calculate_drift_magnitude(self, baseline: float, current: float, direction: str) -> float:
        """Calculate drift magnitude based on direction."""
        if direction == "decrease":
            return (baseline - current) / baseline if baseline > 0 else 0
        else:  # increase
            return (current - baseline) / baseline if baseline > 0 else 0
    
    def _determine_severity(self, drift_magnitude: float, threshold: float) -> DriftSeverity:
        """Determine drift severity level."""
        if drift_magnitude <= threshold:
            return DriftSeverity.LOW
        elif drift_magnitude <= threshold * 2:
            return DriftSeverity.MEDIUM
        elif drift_magnitude <= threshold * 3:
            return DriftSeverity.HIGH
        else:
            return DriftSeverity.CRITICAL
    
    def _should_suppress_alert(self, metric_name: str) -> bool:
        """Check if alert should be suppressed due to cooldown."""
        if metric_name not in self.last_alert_time:
            return False
        
        time_since_last = time.time() - self.last_alert_time[metric_name]
        return time_since_last < (self.alert_cooldown_hours * 3600)
    
    def _check_for_drift(self, current_metrics: ModelMetrics):
        """Check current metrics against baseline for drift."""
        if self.baseline_metrics is None:
            return
        
        for metric_name, config in self.critical_metrics.items():
            baseline_value = getattr(self.baseline_metrics, metric_name)
            current_value = getattr(current_metrics, metric_name)
            
            drift_magnitude = self._calculate_drift_magnitude(
                baseline_value, current_value, config["direction"]
            )
            
            if drift_magnitude > config["threshold"]:
                severity = self._determine_severity(drift_magnitude, config["threshold"])
                
                # Check alert suppression
                if self._should_suppress_alert(metric_name):
                    continue
                
                # Generate alert
                alert = DriftAlert(
                    timestamp=time.time(),
                    model_version=current_metrics.model_version,
                    metric_name=metric_name,
                    baseline_value=baseline_value,
                    current_value=current_value,
                    drift_magnitude=drift_magnitude,
                    severity=severity,
                    recommendation=self._get_recommendation(metric_name, severity, drift_magnitude),
                    alert_id=f"drift_{metric_name}_{int(time.time())}"
                )
                
                self.drift_alerts.append(alert)
                self.last_alert_time[metric_name] = time.time()
                
                logger.warning(f"Model drift detected: {metric_name} = {current_value:.4f} "
                             f"(baseline: {baseline_value:.4f}, drift: {drift_magnitude:.2%}, "
                             f"severity: {severity.value})")
    
    def _get_recommendation(self, metric_name: str, severity: DriftSeverity, drift_magnitude: float) -> str:
        """Get recommendation based on drift detected."""
        if severity == DriftSeverity.CRITICAL:
            if metric_name == "accuracy_score":
                return "IMMEDIATE ACTION: Model accuracy critically degraded. Stop serving traffic and initiate emergency retraining."
            elif metric_name == "response_time_ms":
                return "IMMEDIATE ACTION: Response times critically high. Scale infrastructure or optimize model."
            elif metric_name == "error_rate":
                return "IMMEDIATE ACTION: Error rate critically high. Investigate and fix underlying issues."
            else:
                return "IMMEDIATE ACTION: Critical degradation detected. Immediate investigation required."
        
        elif severity == DriftSeverity.HIGH:
            if metric_name == "accuracy_score":
                return "Schedule model retraining within 24 hours. Consider gradual traffic reduction."
            elif metric_name == "response_time_ms":
                return "Investigate performance bottlenecks. Consider scaling or optimization."
            else:
                return "High drift detected. Schedule investigation and corrective action."
        
        elif severity == DriftSeverity.MEDIUM:
            return f"Moderate drift in {metric_name}. Monitor closely and prepare for potential retraining."
        
        else:
            return f"Low drift in {metric_name}. Continue monitoring."
    
    def get_drift_summary(self) -> Dict[str, Any]:
        """Get comprehensive drift detection summary."""
        recent_alerts = [a for a in self.drift_alerts if time.time() - a.timestamp < 24 * 3600]
        
        # Count alerts by severity
        severity_counts = {}
        for severity in DriftSeverity:
            severity_counts[severity.value] = sum(1 for a in recent_alerts if a.severity == severity)
        
        # Current drift status
        current_status = "healthy"
        if any(a.severity == DriftSeverity.CRITICAL for a in recent_alerts):
            current_status = "critical"
        elif any(a.severity == DriftSeverity.HIGH for a in recent_alerts):
            current_status = "degraded"
        elif any(a.severity == DriftSeverity.MEDIUM for a in recent_alerts):
            current_status = "at_risk"
        
        # Performance trends
        if len(self.metrics_history) >= 2:
            recent_metrics = self.metrics_history[-10:]  # Last 10 measurements
            accuracy_trend = self._calculate_trend([m.accuracy_score for m in recent_metrics])
            response_time_trend = self._calculate_trend([m.response_time_ms for m in recent_metrics])
        else:
            accuracy_trend = response_time_trend = 0.0
        
        return {
            "monitoring_status": {
                "current_status": current_status,
                "baseline_established": self.baseline_metrics is not None,
                "metrics_tracked": len(self.metrics_history),
                "monitoring_duration_hours": (time.time() - self.metrics_history[0].timestamp) / 3600 if self.metrics_history else 0
            },
            "recent_alerts": {
                "total_24h": len(recent_alerts),
                "by_severity": severity_counts,
                "latest_alerts": [asdict(a) for a in recent_alerts[-5:]]  # Last 5 alerts
            },
            "performance_trends": {
                "accuracy_trend": accuracy_trend,
                "response_time_trend": response_time_trend,
                "trend_interpretation": self._interpret_trends(accuracy_trend, response_time_trend)
            },
            "recommendations": self._get_current_recommendations(recent_alerts),
            "baseline_metrics": asdict(self.baseline_metrics) if self.baseline_metrics else None
        }
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate trend direction (-1 to 1, negative = decreasing)."""
        if len(values) < 2:
            return 0.0
        
        # Simple linear regression slope
        x = list(range(len(values)))
        n = len(values)
        
        sum_x = sum(x)
        sum_y = sum(values)
        sum_xy = sum(x[i] * values[i] for i in range(n))
        sum_x_squared = sum(xi * xi for xi in x)
        
        if n * sum_x_squared - sum_x * sum_x == 0:
            return 0.0
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x_squared - sum_x * sum_x)
        
        # Normalize to [-1, 1] range
        max_change = max(values) - min(values) if len(set(values)) > 1 else 1
        normalized_slope = np.clip(slope / max_change, -1, 1) if max_change > 0 else 0
        
        return normalized_slope
    
    def _interpret_trends(self, accuracy_trend: float, response_time_trend: float) -> str:
        """Interpret performance trends."""
        if accuracy_trend < -0.3 and response_time_trend > 0.3:
            return "Degrading performance: accuracy declining and response time increasing"
        elif accuracy_trend < -0.3:
            return "Accuracy declining - investigate model degradation"
        elif response_time_trend > 0.3:
            return "Response times increasing - investigate performance bottlenecks"
        elif accuracy_trend > 0.3 and response_time_trend < -0.3:
            return "Performance improving: accuracy increasing and response time decreasing"
        else:
            return "Performance stable"
    
    def _get_current_recommendations(self, recent_alerts: List[DriftAlert]) -> List[str]:
        """Get current recommendations based on recent alerts."""
        recommendations = []
        
        critical_alerts = [a for a in recent_alerts if a.severity == DriftSeverity.CRITICAL]
        high_alerts = [a for a in recent_alerts if a.severity == DriftSeverity.HIGH]
        
        if critical_alerts:
            recommendations.append("🚨 CRITICAL: Immediate action required - model serving may be compromised")
            recommendations.extend([a.recommendation for a in critical_alerts[-3:]])  # Latest 3
        
        if high_alerts:
            recommendations.append("⚠️  HIGH PRIORITY: Schedule corrective action within 24 hours")
            unique_high_recommendations = list(set([a.recommendation for a in high_alerts[-3:]]))
            recommendations.extend(unique_high_recommendations)
        
        if not recent_alerts:
            recommendations.append("✅ No drift alerts - model performance is stable")
        
        # Add general recommendations
        if len(self.metrics_history) > 100:
            recommendations.append("Consider establishing updated baseline metrics with recent data")
        
        return recommendations
    
    async def simulate_model_performance_monitoring(self, duration_hours: int = 1) -> Dict[str, Any]:
        """Simulate model performance monitoring with gradual degradation."""
        logger.info(f"Starting {duration_hours}h model performance simulation")
        
        # Simulate baseline performance
        baseline_accuracy = 0.92
        baseline_response_time = 120.0
        baseline_error_rate = 0.01
        baseline_satisfaction = 0.85
        
        simulation_results = {
            "simulation_duration_hours": duration_hours,
            "metrics_collected": [],
            "alerts_generated": [],
            "drift_detected": False
        }
        
        # Run simulation
        intervals = max(10, duration_hours * 4)  # At least 10 data points
        interval_seconds = (duration_hours * 3600) / intervals
        
        for i in range(intervals):
            # Simulate gradual performance degradation
            degradation_factor = i / intervals  # 0 to 1
            
            # Add some noise and gradual drift
            accuracy = baseline_accuracy - (degradation_factor * 0.06) + np.random.normal(0, 0.01)
            response_time = baseline_response_time + (degradation_factor * 50) + np.random.normal(0, 10)
            error_rate = baseline_error_rate + (degradation_factor * 0.03) + max(0, np.random.normal(0, 0.005))
            satisfaction = baseline_satisfaction - (degradation_factor * 0.10) + np.random.normal(0, 0.02)
            
            # Create metrics
            metrics = ModelMetrics(
                timestamp=time.time() + (i * interval_seconds),
                model_version="v1_simulation",
                accuracy_score=max(0.5, min(1.0, accuracy)),
                precision=max(0.5, min(1.0, accuracy + 0.02)),
                recall=max(0.5, min(1.0, accuracy - 0.01)),
                f1_score=max(0.5, min(1.0, accuracy + 0.005)),
                response_time_ms=max(50, response_time),
                throughput_rps=max(1, 100 - (degradation_factor * 30)),
                error_rate=min(0.2, max(0, error_rate)),
                user_satisfaction=max(0.3, min(1.0, satisfaction))
            )
            
            # Record metrics and check for drift
            initial_alerts = len(self.drift_alerts)
            self.record_metrics(metrics)
            
            # Track if new alerts were generated
            if len(self.drift_alerts) > initial_alerts:
                simulation_results["drift_detected"] = True
                new_alerts = self.drift_alerts[initial_alerts:]
                simulation_results["alerts_generated"].extend([asdict(a) for a in new_alerts])
            
            simulation_results["metrics_collected"].append(asdict(metrics))
            
            await asyncio.sleep(0.01)  # Small delay for simulation
        
        logger.info(f"Simulation complete: {len(simulation_results['alerts_generated'])} alerts generated")
        
        return simulation_results


# Global drift detector
drift_detector = ModelDriftDetector(baseline_window_hours=24, drift_threshold=0.03)


async def main():
    """Demo model drift detection."""
    print("=== CastMatch Model Drift Detection Demo ===")
    
    # Run simulation
    print("\n1. Simulating model performance monitoring...")
    simulation_result = await drift_detector.simulate_model_performance_monitoring(0.5)  # 30 minutes
    
    print(f"Collected {len(simulation_result['metrics_collected'])} metrics")
    print(f"Generated {len(simulation_result['alerts_generated'])} drift alerts")
    print(f"Drift detected: {simulation_result['drift_detected']}")
    
    # Show drift summary
    print("\n2. Drift Detection Summary:")
    summary = drift_detector.get_drift_summary()
    print(json.dumps(summary, indent=2, default=str))
    
    return summary


if __name__ == "__main__":
    asyncio.run(main())
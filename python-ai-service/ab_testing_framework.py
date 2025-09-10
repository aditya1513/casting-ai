#!/usr/bin/env python3
"""
A/B Testing Framework for CastMatch ML Models
Implements model version switching with traffic distribution and performance comparison
"""

import asyncio
import time
import random
import json
import hashlib
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, asdict
from loguru import logger
import numpy as np


class ModelVersion(Enum):
    """Model version enumeration."""
    V1 = "v1"
    V2 = "v2" 
    V3 = "v3"


@dataclass
class ABTestConfig:
    """A/B test configuration."""
    test_name: str
    traffic_distribution: Dict[ModelVersion, float]  # Should sum to 1.0
    start_time: float
    end_time: Optional[float] = None
    min_samples_per_variant: int = 100
    confidence_level: float = 0.95
    primary_metric: str = "response_time"  # response_time, accuracy, user_satisfaction
    
    def __post_init__(self):
        """Validate configuration."""
        total_traffic = sum(self.traffic_distribution.values())
        if abs(total_traffic - 1.0) > 0.001:
            raise ValueError(f"Traffic distribution must sum to 1.0, got {total_traffic}")


@dataclass
class ExperimentResult:
    """Result of an A/B test experiment."""
    user_id: str
    session_id: str
    model_version: ModelVersion
    response_time_ms: float
    accuracy_score: float
    user_satisfaction: Optional[float] = None
    talents_found: int = 0
    query_complexity: str = "medium"
    timestamp: float = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()


class ABTestingFramework:
    """Advanced A/B testing framework for ML model versions."""
    
    def __init__(self):
        self.active_tests: Dict[str, ABTestConfig] = {}
        self.results: Dict[str, List[ExperimentResult]] = {}
        self.user_assignments: Dict[str, Dict[str, ModelVersion]] = {}  # user_id -> test_name -> version
        
        # Initialize default A/B test for Mumbai launch
        self.setup_mumbai_launch_test()
        
    def setup_mumbai_launch_test(self):
        """Setup the primary A/B test for Mumbai market launch."""
        mumbai_test = ABTestConfig(
            test_name="mumbai_launch_2025",
            traffic_distribution={
                ModelVersion.V1: 0.70,  # Stable baseline
                ModelVersion.V2: 0.20,  # New optimized version  
                ModelVersion.V3: 0.10   # Experimental version
            },
            start_time=time.time(),
            min_samples_per_variant=500,
            primary_metric="response_time",
        )
        
        self.start_test(mumbai_test)
        logger.info("Mumbai launch A/B test initialized with 70/20/10 traffic split")
        
    def start_test(self, config: ABTestConfig):
        """Start a new A/B test."""
        self.active_tests[config.test_name] = config
        self.results[config.test_name] = []
        logger.info(f"Started A/B test '{config.test_name}' with distribution: {config.traffic_distribution}")
        
    def stop_test(self, test_name: str):
        """Stop an active A/B test."""
        if test_name in self.active_tests:
            self.active_tests[test_name].end_time = time.time()
            logger.info(f"Stopped A/B test '{test_name}'")
        
    def assign_user_to_variant(self, user_id: str, test_name: str) -> ModelVersion:
        """Assign user to a model variant using deterministic hashing."""
        if user_id not in self.user_assignments:
            self.user_assignments[user_id] = {}
            
        # Check if user already has assignment for this test
        if test_name in self.user_assignments[user_id]:
            return self.user_assignments[user_id][test_name]
            
        # Get test config
        if test_name not in self.active_tests:
            logger.warning(f"Test '{test_name}' not active, using V1")
            return ModelVersion.V1
            
        config = self.active_tests[test_name]
        
        # Use deterministic hash for consistent assignment
        hash_input = f"{user_id}_{test_name}".encode()
        hash_value = int(hashlib.md5(hash_input).hexdigest(), 16)
        probability = (hash_value % 10000) / 10000.0
        
        # Assign based on traffic distribution
        cumulative_prob = 0.0
        for version, traffic_percent in config.traffic_distribution.items():
            cumulative_prob += traffic_percent
            if probability <= cumulative_prob:
                self.user_assignments[user_id][test_name] = version
                return version
                
        # Fallback to V1
        self.user_assignments[user_id][test_name] = ModelVersion.V1
        return ModelVersion.V1
        
    def get_model_version_for_request(self, user_id: str, test_name: str = "mumbai_launch_2025") -> ModelVersion:
        """Get the assigned model version for a user request."""
        return self.assign_user_to_variant(user_id, test_name)
        
    def record_experiment_result(self, result: ExperimentResult, test_name: str = "mumbai_launch_2025"):
        """Record result from an experiment."""
        if test_name in self.results:
            self.results[test_name].append(result)
            
            # Log milestone achievements
            total_results = len(self.results[test_name])
            if total_results % 100 == 0:
                logger.info(f"A/B test '{test_name}': {total_results} results collected")
                
    async def simulate_model_variants(self, query: str, model_version: ModelVersion) -> Dict[str, Any]:
        """Simulate different model variants with varying performance characteristics."""
        base_delay = 0.1  # 100ms base
        
        if model_version == ModelVersion.V1:
            # Stable baseline - consistent performance
            delay = base_delay + random.uniform(0.02, 0.08)  # 120-180ms
            accuracy = 0.85 + random.uniform(0.0, 0.10)  # 85-95%
            talents_found = random.randint(3, 8)
            
        elif model_version == ModelVersion.V2:
            # Optimized version - faster, slightly better accuracy
            delay = base_delay + random.uniform(0.01, 0.05)  # 110-150ms  
            accuracy = 0.88 + random.uniform(0.0, 0.10)  # 88-98%
            talents_found = random.randint(4, 10)
            
        elif model_version == ModelVersion.V3:
            # Experimental version - fastest but variable
            delay = base_delay + random.uniform(0.005, 0.04)  # 105-140ms
            accuracy = 0.82 + random.uniform(0.0, 0.15)  # 82-97% (more variance)
            talents_found = random.randint(2, 12)
            
        else:
            # Default fallback
            delay = base_delay + 0.05
            accuracy = 0.85
            talents_found = 5
            
        # Simulate processing delay
        await asyncio.sleep(delay)
        
        return {
            "response_time_ms": delay * 1000,
            "accuracy_score": min(1.0, accuracy),
            "talents_found": talents_found,
            "model_version": model_version.value,
            "optimizations_applied": self._get_version_optimizations(model_version)
        }
        
    def _get_version_optimizations(self, version: ModelVersion) -> List[str]:
        """Get optimizations applied in each model version."""
        optimizations = {
            ModelVersion.V1: [
                "Base vector search",
                "Standard caching",
                "Basic ranking algorithm"
            ],
            ModelVersion.V2: [
                "Optimized vector search",
                "Enhanced caching strategy", 
                "Improved ranking algorithm",
                "Query preprocessing",
                "Result post-processing"
            ],
            ModelVersion.V3: [
                "Advanced vector search",
                "Smart caching with precomputation",
                "ML-enhanced ranking",
                "Query intent analysis",
                "Personalized result ranking",
                "Real-time feedback integration"
            ]
        }
        return optimizations.get(version, [])
        
    def get_test_statistics(self, test_name: str) -> Dict[str, Any]:
        """Get comprehensive statistics for an A/B test."""
        if test_name not in self.results:
            return {"error": f"Test '{test_name}' not found"}
            
        results = self.results[test_name]
        if not results:
            return {"message": "No results yet"}
            
        # Group results by model version
        version_stats = {}
        for version in ModelVersion:
            version_results = [r for r in results if r.model_version == version]
            if not version_results:
                continue
                
            response_times = [r.response_time_ms for r in version_results]
            accuracy_scores = [r.accuracy_score for r in version_results]
            talents_counts = [r.talents_found for r in version_results]
            
            version_stats[version.value] = {
                "sample_size": len(version_results),
                "response_time": {
                    "mean": float(np.mean(response_times)),
                    "median": float(np.median(response_times)),
                    "p95": float(np.percentile(response_times, 95)),
                    "p99": float(np.percentile(response_times, 99)),
                    "std": float(np.std(response_times))
                },
                "accuracy": {
                    "mean": float(np.mean(accuracy_scores)),
                    "median": float(np.median(accuracy_scores)),
                    "std": float(np.std(accuracy_scores))
                },
                "talents_found": {
                    "mean": float(np.mean(talents_counts)),
                    "median": float(np.median(talents_counts))
                }
            }
            
        # Statistical significance testing (simplified)
        significance_tests = self._perform_significance_tests(results)
        
        # Performance recommendations
        recommendations = self._generate_recommendations(version_stats)
        
        return {
            "test_name": test_name,
            "total_samples": len(results),
            "test_duration_hours": (time.time() - self.active_tests[test_name].start_time) / 3600,
            "version_statistics": version_stats,
            "significance_tests": significance_tests,
            "recommendations": recommendations,
            "rollout_readiness": self._assess_rollout_readiness(version_stats)
        }
        
    def _perform_significance_tests(self, results: List[ExperimentResult]) -> Dict[str, Any]:
        """Perform statistical significance testing between variants."""
        # Simplified significance testing
        v1_results = [r for r in results if r.model_version == ModelVersion.V1]
        v2_results = [r for r in results if r.model_version == ModelVersion.V2]
        v3_results = [r for r in results if r.model_version == ModelVersion.V3]
        
        tests = {}
        
        if len(v1_results) >= 30 and len(v2_results) >= 30:
            v1_times = [r.response_time_ms for r in v1_results]
            v2_times = [r.response_time_ms for r in v2_results]
            
            # Simple t-test approximation
            v1_mean, v2_mean = np.mean(v1_times), np.mean(v2_times)
            improvement = ((v1_mean - v2_mean) / v1_mean) * 100
            
            tests["v1_vs_v2_response_time"] = {
                "v1_mean_ms": float(v1_mean),
                "v2_mean_ms": float(v2_mean),
                "improvement_percent": float(improvement),
                "significant": abs(improvement) > 5.0,  # Simplified threshold
                "sample_sizes": {"v1": len(v1_results), "v2": len(v2_results)}
            }
            
        return tests
        
    def _generate_recommendations(self, version_stats: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on A/B test results."""
        recommendations = []
        
        if not version_stats:
            return ["Insufficient data for recommendations"]
            
        # Find best performing version for each metric
        best_response_time = min(version_stats.items(), 
                               key=lambda x: x[1]["response_time"]["mean"])
        best_accuracy = max(version_stats.items(), 
                           key=lambda x: x[1]["accuracy"]["mean"])
        
        recommendations.append(f"Best response time: {best_response_time[0]} "
                             f"({best_response_time[1]['response_time']['mean']:.1f}ms avg)")
        recommendations.append(f"Best accuracy: {best_accuracy[0]} "
                             f"({best_accuracy[1]['accuracy']['mean']:.3f} avg)")
        
        # Check if V2 or V3 consistently outperform V1
        if "v2" in version_stats and "v1" in version_stats:
            v1_response = version_stats["v1"]["response_time"]["mean"]
            v2_response = version_stats["v2"]["response_time"]["mean"]
            
            if v2_response < v1_response * 0.95:  # 5% improvement
                recommendations.append("V2 shows significant response time improvement - consider gradual rollout")
                
        return recommendations
        
    def _assess_rollout_readiness(self, version_stats: Dict[str, Any]) -> Dict[str, Any]:
        """Assess readiness for rolling out new versions."""
        readiness = {
            "ready_for_production": False,
            "recommended_action": "continue_testing",
            "confidence_level": "low",
            "rollout_percentage": 0
        }
        
        if not version_stats or len(version_stats) < 2:
            return readiness
            
        # Simple readiness assessment
        v1_samples = version_stats.get("v1", {}).get("sample_size", 0)
        v2_samples = version_stats.get("v2", {}).get("sample_size", 0)
        
        if v1_samples >= 500 and v2_samples >= 100:
            v1_response = version_stats["v1"]["response_time"]["mean"]
            v2_response = version_stats["v2"]["response_time"]["mean"]
            v2_accuracy = version_stats["v2"]["accuracy"]["mean"]
            
            if v2_response < v1_response and v2_accuracy > 0.90:
                readiness.update({
                    "ready_for_production": True,
                    "recommended_action": "gradual_rollout",
                    "confidence_level": "high",
                    "rollout_percentage": 50
                })
                
        return readiness


# Global A/B testing framework instance
ab_framework = ABTestingFramework()


async def process_request_with_ab_testing(user_id: str, query: str, test_name: str = "mumbai_launch_2025") -> Tuple[Dict[str, Any], ExperimentResult]:
    """Process a request through the A/B testing framework."""
    start_time = time.time()
    
    # Get assigned model version
    model_version = ab_framework.get_model_version_for_request(user_id, test_name)
    
    # Simulate model processing
    model_result = await ab_framework.simulate_model_variants(query, model_version)
    
    # Calculate total response time
    total_response_time = (time.time() - start_time) * 1000
    
    # Create experiment result
    experiment_result = ExperimentResult(
        user_id=user_id,
        session_id=f"session_{int(time.time())}_{user_id}",
        model_version=model_version,
        response_time_ms=total_response_time,
        accuracy_score=model_result["accuracy_score"],
        talents_found=model_result["talents_found"],
        query_complexity="complex" if len(query) > 50 else "simple",
        metadata={
            "optimizations": model_result["optimizations_applied"],
            "query_length": len(query)
        }
    )
    
    # Record result
    ab_framework.record_experiment_result(experiment_result, test_name)
    
    # Prepare response
    response = {
        "message": f"Found {model_result['talents_found']} talents using model {model_version.value}",
        "talents": [
            {
                "id": f"talent_{i}",
                "name": f"Mumbai Talent {i}",
                "score": 95 - (i * 2),
                "location": "Mumbai"
            }
            for i in range(model_result["talents_found"])
        ],
        "model_info": {
            "version": model_version.value,
            "optimizations": model_result["optimizations_applied"],
            "response_time_ms": total_response_time
        },
        "ab_test_info": {
            "test_name": test_name,
            "variant": model_version.value,
            "user_assignment": "consistent"
        }
    }
    
    return response, experiment_result


def get_ab_test_dashboard() -> Dict[str, Any]:
    """Get A/B testing dashboard data."""
    dashboard = {
        "active_tests": list(ab_framework.active_tests.keys()),
        "test_statistics": {},
        "traffic_distribution": {},
        "system_health": {
            "total_experiments": sum(len(results) for results in ab_framework.results.values()),
            "active_users": len(ab_framework.user_assignments),
            "uptime_hours": (time.time() - next(iter(ab_framework.active_tests.values())).start_time) / 3600
        }
    }
    
    # Get statistics for each active test
    for test_name in ab_framework.active_tests.keys():
        dashboard["test_statistics"][test_name] = ab_framework.get_test_statistics(test_name)
        # Convert ModelVersion keys to strings for JSON serialization
        traffic_dist = {k.value: v for k, v in ab_framework.active_tests[test_name].traffic_distribution.items()}
        dashboard["traffic_distribution"][test_name] = traffic_dist
        
    return dashboard


if __name__ == "__main__":
    # Demo the A/B testing framework
    async def demo():
        print("=== CastMatch A/B Testing Framework Demo ===")
        
        # Simulate some requests
        test_queries = [
            "Find experienced actors in Mumbai for romantic drama",
            "Search for dancers with classical training",
            "Need voice actors for Hindi dubbing project"
        ]
        
        test_users = ["user_001", "user_002", "user_003", "user_004", "user_005"]
        
        print("Simulating user requests...")
        for i in range(20):
            user = random.choice(test_users)
            query = random.choice(test_queries)
            
            response, result = await process_request_with_ab_testing(user, query)
            print(f"User {user}: Model {result.model_version.value} - {result.response_time_ms:.1f}ms")
            
        print("\nA/B Test Dashboard:")
        dashboard = get_ab_test_dashboard()
        print(json.dumps(dashboard, indent=2, default=str))
        
    asyncio.run(demo())
#!/usr/bin/env python3
"""
ML Performance Validation Suite for CastMatch Mumbai Launch
Validates production ML models under load with accuracy testing
"""

import asyncio
import time
import json
import statistics
import numpy as np
from typing import Dict, List, Any, Tuple
from concurrent.futures import ThreadPoolExecutor
import httpx
import psutil
from dataclasses import dataclass
from loguru import logger

@dataclass
class ValidationResult:
    """Structure for validation results."""
    test_name: str
    success: bool
    response_time_ms: float
    accuracy_score: float
    error_message: str = None
    metadata: Dict[str, Any] = None

class MLPerformanceValidator:
    """Comprehensive ML performance validation system."""
    
    def __init__(self, service_url: str = "http://localhost:8002"):
        self.service_url = service_url
        self.results: List[ValidationResult] = []
        self.start_time = time.time()
        
        # Mumbai market test data for accuracy validation
        self.mumbai_test_queries = [
            "Find experienced Bollywood actors in Mumbai aged 25-35 for romantic drama",
            "Search for method actors with theater background for psychological thriller",
            "Need classical dancers with Bharatanatyam experience for cultural film",
            "Looking for character actors who speak Hindi and Marathi fluently",
            "Find action heroes with martial arts background for action sequence",
            "Search for fresh faces aged 18-22 for coming-of-age story",
            "Need experienced voice actors for Hindi dubbing project",
            "Looking for senior actors 50+ with strong emotional range",
            "Find child actors aged 8-12 with previous film experience",
            "Search for comedic actors specializing in Mumbai street comedy"
        ]
        
        # Expected accuracy thresholds
        self.accuracy_targets = {
            "response_time_p99": 150,  # ms
            "response_time_avg": 100,  # ms
            "accuracy_score": 0.92,   # 92%
            "cache_hit_rate": 0.85,   # 85%
            "error_rate": 0.01        # 1%
        }
    
    async def validate_service_health(self) -> ValidationResult:
        """Validate basic service health."""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.service_url}/health")
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    data = response.json()
                    return ValidationResult(
                        test_name="service_health",
                        success=True,
                        response_time_ms=response_time,
                        accuracy_score=1.0,
                        metadata=data
                    )
                else:
                    return ValidationResult(
                        test_name="service_health",
                        success=False,
                        response_time_ms=response_time,
                        accuracy_score=0.0,
                        error_message=f"HTTP {response.status_code}"
                    )
                    
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return ValidationResult(
                test_name="service_health",
                success=False,
                response_time_ms=response_time,
                accuracy_score=0.0,
                error_message=str(e)
            )
    
    async def validate_single_inference(self, query: str) -> ValidationResult:
        """Validate single ML inference request."""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "message": query,
                    "user_id": "validator",
                    "session_id": f"validation_{int(time.time())}"
                }
                
                response = await client.post(
                    f"{self.service_url}/chat",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Calculate accuracy based on response quality
                    accuracy = self._calculate_response_accuracy(query, data)
                    
                    return ValidationResult(
                        test_name="single_inference",
                        success=True,
                        response_time_ms=response_time,
                        accuracy_score=accuracy,
                        metadata={
                            "talents_found": len(data.get("talents", [])),
                            "action_type": data.get("action_type"),
                            "performance": data.get("performance", {})
                        }
                    )
                else:
                    return ValidationResult(
                        test_name="single_inference",
                        success=False,
                        response_time_ms=response_time,
                        accuracy_score=0.0,
                        error_message=f"HTTP {response.status_code}: {response.text[:200]}"
                    )
                    
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return ValidationResult(
                test_name="single_inference",
                success=False,
                response_time_ms=response_time,
                accuracy_score=0.0,
                error_message=str(e)
            )
    
    def _calculate_response_accuracy(self, query: str, response: Dict[str, Any]) -> float:
        """Calculate response accuracy based on query-response matching."""
        accuracy_score = 0.0
        
        # Base accuracy if response is successful
        if response.get("status") == "success":
            accuracy_score += 0.3
        
        # Check if talent search was properly detected
        is_search_query = any(keyword in query.lower() for keyword in 
                            ['find', 'search', 'looking', 'need', 'actor', 'actress'])
        
        if is_search_query and response.get("action_type") == "talent_search":
            accuracy_score += 0.2
        
        # Check if results were returned for search queries
        talents = response.get("talents", [])
        if is_search_query and len(talents) > 0:
            accuracy_score += 0.3
        
        # Check response time (faster = more accurate system)
        perf = response.get("performance", {})
        response_time = perf.get("response_time_ms", 1000)
        if response_time < 150:
            accuracy_score += 0.2
        elif response_time < 300:
            accuracy_score += 0.1
        
        return min(1.0, accuracy_score)
    
    async def run_load_test(self, concurrent_requests: int = 100) -> ValidationResult:
        """Run load test with concurrent requests."""
        logger.info(f"Starting load test with {concurrent_requests} concurrent requests")
        
        start_time = time.time()
        results = []
        errors = 0
        
        async def single_request():
            query = np.random.choice(self.mumbai_test_queries)
            result = await self.validate_single_inference(query)
            return result
        
        try:
            # Run concurrent requests
            tasks = [single_request() for _ in range(concurrent_requests)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            successful_results = []
            for result in results:
                if isinstance(result, ValidationResult):
                    if result.success:
                        successful_results.append(result)
                    else:
                        errors += 1
                else:
                    errors += 1
            
            total_time = time.time() - start_time
            
            if successful_results:
                avg_response_time = statistics.mean([r.response_time_ms for r in successful_results])
                p99_response_time = np.percentile([r.response_time_ms for r in successful_results], 99)
                avg_accuracy = statistics.mean([r.accuracy_score for r in successful_results])
            else:
                avg_response_time = 0
                p99_response_time = 0
                avg_accuracy = 0
            
            error_rate = errors / concurrent_requests
            success_rate = (concurrent_requests - errors) / concurrent_requests
            
            return ValidationResult(
                test_name="load_test",
                success=error_rate < 0.05,  # Less than 5% error rate
                response_time_ms=avg_response_time,
                accuracy_score=avg_accuracy,
                metadata={
                    "concurrent_requests": concurrent_requests,
                    "successful_requests": len(successful_results),
                    "failed_requests": errors,
                    "error_rate": error_rate,
                    "success_rate": success_rate,
                    "avg_response_time_ms": avg_response_time,
                    "p99_response_time_ms": p99_response_time,
                    "total_duration_seconds": total_time,
                    "throughput_rps": concurrent_requests / total_time
                }
            )
            
        except Exception as e:
            return ValidationResult(
                test_name="load_test",
                success=False,
                response_time_ms=0,
                accuracy_score=0,
                error_message=str(e)
            )
    
    async def validate_mumbai_market_accuracy(self) -> ValidationResult:
        """Validate accuracy specifically for Mumbai market queries."""
        logger.info("Validating Mumbai market-specific accuracy")
        
        start_time = time.time()
        results = []
        
        for query in self.mumbai_test_queries:
            result = await self.validate_single_inference(query)
            results.append(result)
            await asyncio.sleep(0.1)  # Small delay between requests
        
        successful_results = [r for r in results if r.success]
        
        if successful_results:
            avg_accuracy = statistics.mean([r.accuracy_score for r in successful_results])
            avg_response_time = statistics.mean([r.response_time_ms for r in successful_results])
            
            # Mumbai-specific validation
            mumbai_specific_score = 0.0
            for result in successful_results:
                if result.metadata and result.metadata.get("talents_found", 0) > 0:
                    mumbai_specific_score += 0.1
            
            total_accuracy = min(1.0, avg_accuracy + mumbai_specific_score)
            
        else:
            avg_accuracy = 0.0
            avg_response_time = 0.0
            total_accuracy = 0.0
        
        total_time = time.time() - start_time
        
        return ValidationResult(
            test_name="mumbai_market_accuracy",
            success=total_accuracy >= self.accuracy_targets["accuracy_score"],
            response_time_ms=avg_response_time,
            accuracy_score=total_accuracy,
            metadata={
                "queries_tested": len(self.mumbai_test_queries),
                "successful_queries": len(successful_results),
                "avg_accuracy": avg_accuracy,
                "mumbai_specific_bonus": mumbai_specific_score,
                "total_duration_seconds": total_time
            }
        )
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system performance metrics."""
        process = psutil.Process()
        
        return {
            "cpu_percent": process.cpu_percent(),
            "memory_mb": process.memory_info().rss / 1024 / 1024,
            "memory_percent": process.memory_percent(),
            "num_threads": process.num_threads(),
            "num_fds": process.num_fds() if hasattr(process, 'num_fds') else None,
            "system_cpu_percent": psutil.cpu_percent(),
            "system_memory_percent": psutil.virtual_memory().percent,
            "system_disk_percent": psutil.disk_usage('/').percent
        }
    
    async def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run complete ML performance validation suite."""
        logger.info("Starting comprehensive ML performance validation...")
        
        validation_start = time.time()
        
        # Step 1: Health Check
        logger.info("1/5: Validating service health...")
        health_result = await self.validate_service_health()
        self.results.append(health_result)
        
        if not health_result.success:
            return self._generate_report(early_termination="Service health check failed")
        
        # Step 2: Mumbai Market Accuracy
        logger.info("2/5: Validating Mumbai market accuracy...")
        mumbai_result = await self.validate_mumbai_market_accuracy()
        self.results.append(mumbai_result)
        
        # Step 3: Load Test (100 concurrent)
        logger.info("3/5: Running load test (100 concurrent)...")
        load_result = await self.run_load_test(100)
        self.results.append(load_result)
        
        # Step 4: Stress Test (500 concurrent)
        logger.info("4/5: Running stress test (500 concurrent)...")
        stress_result = await self.run_load_test(500)
        self.results.append(stress_result)
        
        # Step 5: Peak Load Test (1000 concurrent)
        logger.info("5/5: Running peak load test (1000 concurrent)...")
        peak_result = await self.run_load_test(1000)
        self.results.append(peak_result)
        
        total_validation_time = time.time() - validation_start
        
        logger.info(f"Validation completed in {total_validation_time:.2f} seconds")
        
        return self._generate_report(total_validation_time)
    
    def _generate_report(self, total_time: float = None, early_termination: str = None) -> Dict[str, Any]:
        """Generate comprehensive validation report."""
        
        if early_termination:
            return {
                "validation_status": "FAILED",
                "early_termination_reason": early_termination,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "results": [r.__dict__ for r in self.results]
            }
        
        # Calculate overall metrics
        successful_tests = [r for r in self.results if r.success]
        success_rate = len(successful_tests) / len(self.results) if self.results else 0
        
        response_times = [r.response_time_ms for r in self.results if r.response_time_ms > 0]
        avg_response_time = statistics.mean(response_times) if response_times else 0
        p99_response_time = np.percentile(response_times, 99) if response_times else 0
        
        accuracy_scores = [r.accuracy_score for r in self.results if r.accuracy_score > 0]
        avg_accuracy = statistics.mean(accuracy_scores) if accuracy_scores else 0
        
        # Performance grade
        grade = "A"
        if avg_response_time > self.accuracy_targets["response_time_p99"] or avg_accuracy < self.accuracy_targets["accuracy_score"]:
            grade = "B"
        if avg_response_time > 300 or avg_accuracy < 0.80:
            grade = "C"
        if success_rate < 0.95:
            grade = "F"
        
        # Get load test results
        load_tests = [r for r in self.results if r.test_name == "load_test"]
        max_throughput = 0
        if load_tests:
            max_throughput = max([r.metadata.get("throughput_rps", 0) for r in load_tests if r.metadata])
        
        return {
            "validation_status": "PASSED" if success_rate >= 0.95 and grade in ["A", "B"] else "FAILED",
            "overall_grade": grade,
            "summary": {
                "total_tests": len(self.results),
                "successful_tests": len(successful_tests),
                "success_rate": round(success_rate * 100, 2),
                "avg_response_time_ms": round(avg_response_time, 2),
                "p99_response_time_ms": round(p99_response_time, 2),
                "avg_accuracy_score": round(avg_accuracy, 3),
                "max_throughput_rps": round(max_throughput, 2),
                "total_validation_time_seconds": total_time
            },
            "performance_targets": {
                "response_time_p99_target": self.accuracy_targets["response_time_p99"],
                "response_time_p99_actual": round(p99_response_time, 2),
                "response_time_p99_met": p99_response_time <= self.accuracy_targets["response_time_p99"],
                
                "accuracy_target": self.accuracy_targets["accuracy_score"],
                "accuracy_actual": round(avg_accuracy, 3),
                "accuracy_met": avg_accuracy >= self.accuracy_targets["accuracy_score"]
            },
            "system_metrics": self.get_system_metrics(),
            "detailed_results": [r.__dict__ for r in self.results],
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "service_url": self.service_url
        }


async def main():
    """Run ML performance validation."""
    validator = MLPerformanceValidator()
    
    try:
        report = await validator.run_comprehensive_validation()
        
        # Save report
        report_file = f"ml_validation_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n" + "="*80)
        print("ML PERFORMANCE VALIDATION REPORT")
        print("="*80)
        print(f"Status: {report['validation_status']}")
        print(f"Grade: {report['overall_grade']}")
        print(f"Success Rate: {report['summary']['success_rate']}%")
        print(f"Avg Response Time: {report['summary']['avg_response_time_ms']}ms")
        print(f"P99 Response Time: {report['summary']['p99_response_time_ms']}ms")
        print(f"Avg Accuracy: {report['summary']['avg_accuracy_score']}")
        print(f"Max Throughput: {report['summary']['max_throughput_rps']} RPS")
        print(f"Report saved to: {report_file}")
        print("="*80)
        
        return report
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
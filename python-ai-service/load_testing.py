#!/usr/bin/env python3
"""
Load Testing Suite for CastMatch ML Service
Tests ML endpoints with 1000+ concurrent requests for Mumbai launch validation
"""

import asyncio
import time
import json
import statistics
from typing import Dict, List, Any, Tuple
import httpx
import numpy as np
from dataclasses import dataclass
from loguru import logger
from concurrent.futures import ThreadPoolExecutor, as_completed


@dataclass
class LoadTestResult:
    """Individual load test result."""
    request_id: int
    endpoint: str
    response_time_ms: float
    status_code: int
    success: bool
    payload_size_bytes: int
    response_size_bytes: int
    error_message: str = None


class LoadTestSuite:
    """Comprehensive load testing suite for ML endpoints."""
    
    def __init__(self, service_url: str = "http://localhost:8002"):
        self.service_url = service_url
        self.mumbai_test_queries = [
            "Find experienced Bollywood actors in Mumbai aged 25-35",
            "Search for classical dancers with Bharatanatyam training",
            "Need voice actors fluent in Hindi and Marathi",
            "Looking for method actors with theater background",
            "Find action stars with martial arts experience",
            "Search for character actors for psychological thriller",
            "Need fresh faces aged 18-22 for romantic drama",
            "Find senior actors 50+ with strong emotional range",
            "Looking for child actors 8-12 with film experience",
            "Search for comedic actors specializing in Mumbai street comedy",
            "Find actors with regional language expertise",
            "Need dancers trained in multiple Indian classical forms",
            "Search for actors with modeling background",
            "Find stunt performers with safety certification",
            "Looking for background artists for crowd scenes"
        ]
        
    async def single_request(self, request_id: int, endpoint: str, payload: Dict[str, Any] = None) -> LoadTestResult:
        """Execute single load test request."""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload_size = len(json.dumps(payload)) if payload else 0
                
                if payload:
                    response = await client.post(f"{self.service_url}/{endpoint}", json=payload)
                else:
                    response = await client.get(f"{self.service_url}/{endpoint}")
                
                response_time = (time.time() - start_time) * 1000
                response_size = len(response.content)
                
                return LoadTestResult(
                    request_id=request_id,
                    endpoint=endpoint,
                    response_time_ms=response_time,
                    status_code=response.status_code,
                    success=response.status_code == 200,
                    payload_size_bytes=payload_size,
                    response_size_bytes=response_size
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return LoadTestResult(
                request_id=request_id,
                endpoint=endpoint,
                response_time_ms=response_time,
                status_code=0,
                success=False,
                payload_size_bytes=0,
                response_size_bytes=0,
                error_message=str(e)
            )
    
    async def concurrent_chat_test(self, concurrent_requests: int = 100) -> Dict[str, Any]:
        """Test chat endpoint with concurrent requests."""
        logger.info(f"Starting concurrent chat test with {concurrent_requests} requests")
        
        # Generate test payloads
        payloads = []
        for i in range(concurrent_requests):
            query = np.random.choice(self.mumbai_test_queries)
            payloads.append({
                "message": query,
                "user_id": f"load_test_user_{i % 20}",
                "session_id": f"load_test_session_{i}"
            })
        
        # Execute concurrent requests
        start_time = time.time()
        tasks = [
            self.single_request(i, "chat", payload)
            for i, payload in enumerate(payloads)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # Process results
        successful_results = []
        failed_results = []
        
        for result in results:
            if isinstance(result, LoadTestResult):
                if result.success:
                    successful_results.append(result)
                else:
                    failed_results.append(result)
            else:
                # Exception occurred
                failed_results.append(result)
        
        # Calculate metrics
        success_rate = len(successful_results) / concurrent_requests
        
        if successful_results:
            response_times = [r.response_time_ms for r in successful_results]
            avg_response_time = statistics.mean(response_times)
            p50_response_time = statistics.median(response_times)
            p95_response_time = np.percentile(response_times, 95)
            p99_response_time = np.percentile(response_times, 99)
        else:
            avg_response_time = p50_response_time = p95_response_time = p99_response_time = 0
        
        throughput = concurrent_requests / total_time
        
        return {
            "test_type": "concurrent_chat",
            "concurrent_requests": concurrent_requests,
            "total_duration_seconds": round(total_time, 2),
            "success_rate_percent": round(success_rate * 100, 2),
            "throughput_rps": round(throughput, 2),
            "response_times": {
                "avg_ms": round(avg_response_time, 2),
                "p50_ms": round(p50_response_time, 2),
                "p95_ms": round(p95_response_time, 2),
                "p99_ms": round(p99_response_time, 2)
            },
            "results_breakdown": {
                "successful": len(successful_results),
                "failed": len(failed_results),
                "errors": [r.error_message for r in failed_results if hasattr(r, 'error_message') and r.error_message]
            }
        }
    
    async def health_endpoint_stress_test(self, requests_per_second: int = 100, duration_seconds: int = 30) -> Dict[str, Any]:
        """Stress test health endpoint."""
        logger.info(f"Stress testing health endpoint: {requests_per_second} RPS for {duration_seconds}s")
        
        total_requests = requests_per_second * duration_seconds
        interval = 1.0 / requests_per_second
        
        results = []
        start_time = time.time()
        
        async def make_request(request_id: int) -> LoadTestResult:
            return await self.single_request(request_id, "health")
        
        # Schedule requests at specified rate
        for i in range(total_requests):
            if time.time() - start_time >= duration_seconds:
                break
                
            task = asyncio.create_task(make_request(i))
            results.append(task)
            
            await asyncio.sleep(interval)
        
        # Collect results
        completed_results = []
        for task in results:
            try:
                result = await task
                completed_results.append(result)
            except Exception as e:
                logger.error(f"Task failed: {e}")
        
        total_time = time.time() - start_time
        successful = [r for r in completed_results if r.success]
        
        return {
            "test_type": "health_stress_test",
            "target_rps": requests_per_second,
            "duration_seconds": duration_seconds,
            "actual_requests": len(completed_results),
            "actual_rps": round(len(completed_results) / total_time, 2),
            "success_rate_percent": round(len(successful) / len(completed_results) * 100, 2) if completed_results else 0,
            "avg_response_time_ms": round(statistics.mean([r.response_time_ms for r in successful]), 2) if successful else 0
        }
    
    async def benchmark_endpoint_test(self, iterations: int = 50) -> Dict[str, Any]:
        """Test benchmark endpoint performance."""
        logger.info(f"Testing benchmark endpoint with {iterations} iterations")
        
        tasks = [
            self.single_request(i, "benchmark")
            for i in range(iterations)
        ]
        
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        successful = [r for r in results if isinstance(r, LoadTestResult) and r.success]
        
        if successful:
            response_times = [r.response_time_ms for r in successful]
            avg_response_time = statistics.mean(response_times)
        else:
            avg_response_time = 0
        
        return {
            "test_type": "benchmark_endpoint",
            "iterations": iterations,
            "success_rate_percent": round(len(successful) / iterations * 100, 2),
            "avg_response_time_ms": round(avg_response_time, 2),
            "throughput_rps": round(iterations / total_time, 2)
        }
    
    async def peak_load_test(self, max_concurrent: int = 1000) -> Dict[str, Any]:
        """Test system under peak load conditions."""
        logger.info(f"Starting peak load test with up to {max_concurrent} concurrent requests")
        
        # Ramp up gradually
        ramp_stages = [50, 100, 250, 500, 750, max_concurrent]
        results = {}
        
        for stage in ramp_stages:
            logger.info(f"Testing {stage} concurrent requests...")
            
            try:
                stage_result = await self.concurrent_chat_test(stage)
                results[f"stage_{stage}"] = stage_result
                
                # Check if system is struggling
                if stage_result["success_rate_percent"] < 95 or stage_result["response_times"]["p99_ms"] > 2000:
                    logger.warning(f"System showing stress at {stage} concurrent requests")
                    results["max_stable_load"] = stage // 2  # Previous stage was stable
                    break
                
                # Brief pause between stages
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Peak load test failed at stage {stage}: {e}")
                results[f"stage_{stage}"] = {"error": str(e)}
                break
        
        # Determine system limits
        successful_stages = [k for k, v in results.items() if k.startswith("stage_") and "error" not in v]
        
        if successful_stages:
            max_tested = max([int(k.split("_")[1]) for k in successful_stages])
            results["system_capacity"] = {
                "max_tested_concurrent": max_tested,
                "recommended_max": int(max_tested * 0.8),  # 80% of max for safety
                "peak_performance_sustainable": all(
                    results[stage]["success_rate_percent"] >= 98 
                    for stage in successful_stages
                )
            }
        
        return results
    
    async def run_comprehensive_load_test(self) -> Dict[str, Any]:
        """Run comprehensive load testing suite."""
        logger.info("Starting comprehensive load testing suite")
        
        comprehensive_results = {
            "test_start_time": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "service_url": self.service_url,
            "tests": {}
        }
        
        # Test 1: Basic concurrent load
        logger.info("1/5: Basic concurrent load test (100 requests)...")
        comprehensive_results["tests"]["basic_concurrent"] = await self.concurrent_chat_test(100)
        
        # Test 2: Medium concurrent load  
        logger.info("2/5: Medium concurrent load test (250 requests)...")
        comprehensive_results["tests"]["medium_concurrent"] = await self.concurrent_chat_test(250)
        
        # Test 3: Health endpoint stress test
        logger.info("3/5: Health endpoint stress test...")
        comprehensive_results["tests"]["health_stress"] = await self.health_endpoint_stress_test(50, 30)
        
        # Test 4: Benchmark endpoint test
        logger.info("4/5: Benchmark endpoint test...")
        comprehensive_results["tests"]["benchmark_endpoint"] = await self.benchmark_endpoint_test(20)
        
        # Test 5: Peak load test (up to 1000 concurrent)
        logger.info("5/5: Peak load test...")
        comprehensive_results["tests"]["peak_load"] = await self.peak_load_test(1000)
        
        # Overall assessment
        basic_success = comprehensive_results["tests"]["basic_concurrent"]["success_rate_percent"] >= 95
        medium_success = comprehensive_results["tests"]["medium_concurrent"]["success_rate_percent"] >= 95
        health_success = comprehensive_results["tests"]["health_stress"]["success_rate_percent"] >= 95
        
        overall_grade = "A" if all([basic_success, medium_success, health_success]) else "B" if basic_success else "C"
        
        comprehensive_results["overall_assessment"] = {
            "grade": overall_grade,
            "production_ready": overall_grade in ["A", "B"],
            "max_recommended_concurrent": comprehensive_results["tests"]["peak_load"].get("system_capacity", {}).get("recommended_max", 100),
            "key_metrics": {
                "basic_load_success_rate": comprehensive_results["tests"]["basic_concurrent"]["success_rate_percent"],
                "medium_load_success_rate": comprehensive_results["tests"]["medium_concurrent"]["success_rate_percent"],
                "peak_load_capacity": comprehensive_results["tests"]["peak_load"].get("system_capacity", {}).get("max_tested_concurrent", "unknown")
            }
        }
        
        comprehensive_results["test_end_time"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        return comprehensive_results


async def main():
    """Run load testing suite."""
    load_tester = LoadTestSuite()
    
    print("=== CastMatch ML Service Load Testing Suite ===")
    
    try:
        # Run comprehensive load test
        results = await load_tester.run_comprehensive_load_test()
        
        # Save results
        report_file = f"load_test_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Print summary
        print("\n" + "="*80)
        print("LOAD TESTING RESULTS SUMMARY")
        print("="*80)
        print(f"Overall Grade: {results['overall_assessment']['grade']}")
        print(f"Production Ready: {results['overall_assessment']['production_ready']}")
        print(f"Max Recommended Concurrent: {results['overall_assessment']['max_recommended_concurrent']}")
        print("\nKey Metrics:")
        for key, value in results['overall_assessment']['key_metrics'].items():
            print(f"  {key}: {value}")
        print(f"\nDetailed report saved to: {report_file}")
        print("="*80)
        
        return results
        
    except Exception as e:
        logger.error(f"Load testing failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
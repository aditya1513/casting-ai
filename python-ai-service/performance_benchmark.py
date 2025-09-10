"""Performance benchmarks and validation tests for the optimized AI service."""

import asyncio
import time
import statistics
import json
import httpx
from typing import Dict, Any, List, Tuple
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from loguru import logger
import psutil
import gc


class PerformanceBenchmark:
    """Comprehensive performance benchmarking suite."""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.client = None
        self.results = {}
        self.start_memory = 0
        self.start_cpu = 0
        
    async def __aenter__(self):
        """Async context manager entry."""
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # Record initial system state
        process = psutil.Process()
        self.start_memory = process.memory_info().rss / 1024 / 1024  # MB
        self.start_cpu = process.cpu_percent()
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.client:
            await self.client.aclose()
    
    async def test_service_availability(self) -> Dict[str, Any]:
        """Test if the service is available and responding."""
        logger.info("Testing service availability...")
        
        try:
            start_time = time.time()
            response = await self.client.get(f"{self.base_url}/health")
            end_time = time.time()
            
            if response.status_code == 200:
                health_data = response.json()
                return {
                    "available": True,
                    "response_time_ms": round((end_time - start_time) * 1000, 2),
                    "status": health_data.get("status", "unknown"),
                    "version": health_data.get("version", "unknown"),
                    "uptime": health_data.get("uptime_seconds", 0)
                }
            else:
                return {
                    "available": False,
                    "status_code": response.status_code,
                    "response_time_ms": round((end_time - start_time) * 1000, 2)
                }
                
        except Exception as e:
            logger.error(f"Service availability test failed: {e}")
            return {
                "available": False,
                "error": str(e)
            }
    
    async def benchmark_chat_performance(self, num_requests: int = 50) -> Dict[str, Any]:
        """Benchmark chat endpoint performance."""
        logger.info(f"Benchmarking chat performance with {num_requests} requests...")
        
        # Test scenarios
        test_messages = [
            "Find actors in Mumbai aged 25-35",
            "Looking for experienced dancers for Bollywood film",
            "Need character actors with theater background",
            "Search for actresses with action movie experience",
            "Find young actors for romantic comedy role",
            "Looking for veteran actors with gravitas",
            "Need dancers who can also act",
            "Find actors who speak Hindi and English fluently",
            "Search for comedy actors with improv skills",
            "Need actors for historical drama period film"
        ]
        
        response_times = []
        errors = 0
        successful_searches = 0
        
        start_time = time.time()
        
        for i in range(num_requests):
            message = test_messages[i % len(test_messages)]
            
            try:
                request_start = time.time()
                
                response = await self.client.post(f"{self.base_url}/chat", json={
                    "message": message,
                    "user_id": f"benchmark_user_{i}",
                    "session_id": f"benchmark_session_{i % 10}",  # Simulate 10 concurrent sessions
                    "search_criteria": {
                        "location": "Mumbai" if i % 3 == 0 else None,
                        "min_age": 20 if i % 4 == 0 else None,
                        "max_age": 40 if i % 4 == 0 else None
                    }
                })
                
                request_end = time.time()
                response_time = (request_end - request_start) * 1000  # Convert to ms
                response_times.append(response_time)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "success":
                        if data.get("talents") and len(data["talents"]) > 0:
                            successful_searches += 1
                    else:
                        errors += 1
                else:
                    errors += 1
                    
            except Exception as e:
                logger.error(f"Request {i} failed: {e}")
                errors += 1
        
        total_time = time.time() - start_time
        
        if response_times:
            return {
                "total_requests": num_requests,
                "successful_requests": len(response_times),
                "errors": errors,
                "successful_searches": successful_searches,
                "total_time_seconds": round(total_time, 2),
                "requests_per_second": round(num_requests / total_time, 2),
                "response_times": {
                    "min_ms": round(min(response_times), 2),
                    "max_ms": round(max(response_times), 2),
                    "avg_ms": round(statistics.mean(response_times), 2),
                    "median_ms": round(statistics.median(response_times), 2),
                    "p95_ms": round(np.percentile(response_times, 95), 2),
                    "p99_ms": round(np.percentile(response_times, 99), 2)
                },
                "performance_target_met": {
                    "avg_under_1s": statistics.mean(response_times) < 1000,
                    "p95_under_2s": np.percentile(response_times, 95) < 2000,
                    "p99_under_3s": np.percentile(response_times, 99) < 3000
                }
            }
        else:
            return {
                "total_requests": num_requests,
                "successful_requests": 0,
                "errors": errors,
                "error": "No successful requests"
            }
    
    async def benchmark_concurrent_performance(self, concurrent_users: int = 10, requests_per_user: int = 5) -> Dict[str, Any]:
        """Benchmark concurrent request handling."""
        logger.info(f"Benchmarking concurrent performance: {concurrent_users} users, {requests_per_user} requests each...")
        
        async def user_simulation(user_id: int) -> List[float]:
            """Simulate a single user making multiple requests."""
            user_response_times = []
            
            for i in range(requests_per_user):
                try:
                    start_time = time.time()
                    
                    response = await self.client.post(f"{self.base_url}/chat", json={
                        "message": f"Find actors for user {user_id} request {i}",
                        "user_id": f"concurrent_user_{user_id}",
                        "session_id": f"concurrent_session_{user_id}"
                    })
                    
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000
                    
                    if response.status_code == 200:
                        user_response_times.append(response_time)
                    
                    # Small delay between requests from same user
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"Concurrent user {user_id} request {i} failed: {e}")
            
            return user_response_times
        
        # Execute all users concurrently
        start_time = time.time()
        
        tasks = [user_simulation(user_id) for user_id in range(concurrent_users)]
        all_user_results = await asyncio.gather(*tasks)
        
        total_time = time.time() - start_time
        
        # Aggregate results
        all_response_times = []
        successful_users = 0
        
        for user_results in all_user_results:
            if user_results:
                all_response_times.extend(user_results)
                if len(user_results) >= requests_per_user * 0.8:  # At least 80% success
                    successful_users += 1
        
        total_requests = concurrent_users * requests_per_user
        
        if all_response_times:
            return {
                "concurrent_users": concurrent_users,
                "requests_per_user": requests_per_user,
                "total_requests": total_requests,
                "successful_requests": len(all_response_times),
                "successful_users": successful_users,
                "total_time_seconds": round(total_time, 2),
                "overall_rps": round(len(all_response_times) / total_time, 2),
                "response_times": {
                    "min_ms": round(min(all_response_times), 2),
                    "max_ms": round(max(all_response_times), 2),
                    "avg_ms": round(statistics.mean(all_response_times), 2),
                    "median_ms": round(statistics.median(all_response_times), 2),
                    "p95_ms": round(np.percentile(all_response_times, 95), 2),
                    "p99_ms": round(np.percentile(all_response_times, 99), 2)
                },
                "concurrency_performance": {
                    "degradation_vs_single": "tbd",  # Would need single-user baseline
                    "successful_user_rate": round((successful_users / concurrent_users) * 100, 1)
                }
            }
        else:
            return {
                "concurrent_users": concurrent_users,
                "requests_per_user": requests_per_user,
                "total_requests": total_requests,
                "successful_requests": 0,
                "error": "No successful requests in concurrent test"
            }
    
    async def test_caching_performance(self) -> Dict[str, Any]:
        """Test caching effectiveness."""
        logger.info("Testing caching performance...")
        
        test_message = "Find experienced actors in Mumbai for drama film"
        
        # First request (cache miss)
        start_time = time.time()
        response1 = await self.client.post(f"{self.base_url}/chat", json={
            "message": test_message,
            "user_id": "cache_test_user",
            "session_id": "cache_test_session"
        })
        first_request_time = (time.time() - start_time) * 1000
        
        await asyncio.sleep(0.1)  # Small delay
        
        # Second request (potential cache hit)
        start_time = time.time()
        response2 = await self.client.post(f"{self.base_url}/chat", json={
            "message": test_message,
            "user_id": "cache_test_user",
            "session_id": "cache_test_session"
        })
        second_request_time = (time.time() - start_time) * 1000
        
        # Get cache statistics
        cache_stats = {}
        try:
            cache_response = await self.client.get(f"{self.base_url}/cache-stats")
            if cache_response.status_code == 200:
                cache_stats = cache_response.json()
        except:
            pass
        
        cache_improvement = 0
        if first_request_time > 0:
            cache_improvement = round(((first_request_time - second_request_time) / first_request_time) * 100, 1)
        
        return {
            "first_request_ms": round(first_request_time, 2),
            "second_request_ms": round(second_request_time, 2),
            "cache_improvement_percent": cache_improvement,
            "cache_effective": second_request_time < first_request_time * 0.8,  # 20% improvement threshold
            "cache_stats": cache_stats
        }
    
    async def test_memory_usage(self, duration_seconds: int = 60) -> Dict[str, Any]:
        """Test memory usage over time with continuous requests."""
        logger.info(f"Testing memory usage over {duration_seconds} seconds...")
        
        memory_samples = []
        request_count = 0
        start_time = time.time()
        
        while time.time() - start_time < duration_seconds:
            # Make request
            try:
                await self.client.post(f"{self.base_url}/chat", json={
                    "message": f"Memory test request {request_count}",
                    "user_id": "memory_test_user",
                    "session_id": "memory_test_session"
                })
                request_count += 1
            except:
                pass
            
            # Sample memory
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            memory_samples.append({
                "timestamp": time.time() - start_time,
                "memory_mb": memory_mb,
                "requests_completed": request_count
            })
            
            await asyncio.sleep(1)  # Sample every second
        
        if memory_samples:
            memory_values = [sample["memory_mb"] for sample in memory_samples]
            memory_growth = memory_values[-1] - memory_values[0] if len(memory_values) > 1 else 0
            
            return {
                "test_duration_seconds": duration_seconds,
                "total_requests": request_count,
                "requests_per_second": round(request_count / duration_seconds, 2),
                "memory_usage": {
                    "start_mb": round(memory_values[0], 2),
                    "end_mb": round(memory_values[-1], 2),
                    "peak_mb": round(max(memory_values), 2),
                    "growth_mb": round(memory_growth, 2),
                    "avg_mb": round(statistics.mean(memory_values), 2)
                },
                "memory_stable": abs(memory_growth) < 50,  # Less than 50MB growth
                "samples": memory_samples[-10:]  # Last 10 samples
            }
        else:
            return {"error": "No memory samples collected"}
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics from the service."""
        try:
            response = await self.client.get(f"{self.base_url}/performance")
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"Failed to get metrics: {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}
    
    def calculate_performance_score(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall performance score based on benchmark results."""
        score = 100
        issues = []
        
        # Response time scoring (40 points max)
        chat_perf = results.get("chat_performance", {})
        if chat_perf.get("response_times"):
            avg_time = chat_perf["response_times"].get("avg_ms", 0)
            p95_time = chat_perf["response_times"].get("p95_ms", 0)
            
            if avg_time > 1000:
                score -= 20
                issues.append(f"Average response time too high: {avg_time}ms > 1000ms")
            elif avg_time > 500:
                score -= 10
                issues.append(f"Average response time high: {avg_time}ms > 500ms")
            
            if p95_time > 2000:
                score -= 20
                issues.append(f"P95 response time too high: {p95_time}ms > 2000ms")
            elif p95_time > 1000:
                score -= 10
                issues.append(f"P95 response time high: {p95_time}ms > 1000ms")
        
        # Error rate scoring (20 points max)
        error_rate = 0
        if chat_perf.get("total_requests", 0) > 0:
            error_rate = (chat_perf.get("errors", 0) / chat_perf["total_requests"]) * 100
        
        if error_rate > 5:
            score -= 20
            issues.append(f"High error rate: {error_rate:.1f}% > 5%")
        elif error_rate > 1:
            score -= 10
            issues.append(f"Moderate error rate: {error_rate:.1f}% > 1%")
        
        # Concurrent performance scoring (20 points max)
        concurrent_perf = results.get("concurrent_performance", {})
        if concurrent_perf.get("successful_user_rate", 0) < 90:
            score -= 20
            issues.append(f"Low concurrent success rate: {concurrent_perf.get('successful_user_rate', 0)}% < 90%")
        elif concurrent_perf.get("successful_user_rate", 0) < 95:
            score -= 10
            issues.append(f"Moderate concurrent success rate: {concurrent_perf.get('successful_user_rate', 0)}% < 95%")
        
        # Memory stability scoring (10 points max)
        memory_test = results.get("memory_usage", {})
        if not memory_test.get("memory_stable", True):
            score -= 10
            growth = memory_test.get("memory_usage", {}).get("growth_mb", 0)
            issues.append(f"Memory not stable: {growth}MB growth")
        
        # Caching effectiveness scoring (10 points max)
        cache_test = results.get("caching_performance", {})
        if not cache_test.get("cache_effective", False):
            score -= 10
            improvement = cache_test.get("cache_improvement_percent", 0)
            issues.append(f"Caching not effective: {improvement}% improvement")
        
        # Determine grade
        if score >= 90:
            grade = "A"
        elif score >= 80:
            grade = "B"
        elif score >= 70:
            grade = "C"
        elif score >= 60:
            grade = "D"
        else:
            grade = "F"
        
        return {
            "overall_score": max(0, score),
            "grade": grade,
            "issues": issues,
            "summary": {
                "performance_excellent": score >= 90,
                "production_ready": score >= 80,
                "needs_optimization": score < 70,
                "critical_issues": score < 50
            }
        }
    
    async def run_comprehensive_benchmark(self) -> Dict[str, Any]:
        """Run all benchmarks and return comprehensive results."""
        logger.info("Starting comprehensive performance benchmark...")
        
        all_results = {}
        
        # Test service availability
        logger.info("1/6 Testing service availability...")
        all_results["availability"] = await self.test_service_availability()
        
        if not all_results["availability"].get("available"):
            logger.error("Service not available, stopping benchmarks")
            return all_results
        
        # Test chat performance
        logger.info("2/6 Testing chat performance...")
        all_results["chat_performance"] = await self.benchmark_chat_performance(num_requests=30)
        
        # Test concurrent performance
        logger.info("3/6 Testing concurrent performance...")
        all_results["concurrent_performance"] = await self.benchmark_concurrent_performance(
            concurrent_users=5, requests_per_user=3
        )
        
        # Test caching performance
        logger.info("4/6 Testing caching performance...")
        all_results["caching_performance"] = await self.test_caching_performance()
        
        # Test memory usage
        logger.info("5/6 Testing memory usage...")
        all_results["memory_usage"] = await self.test_memory_usage(duration_seconds=30)
        
        # Get performance metrics
        logger.info("6/6 Getting performance metrics...")
        all_results["service_metrics"] = await self.get_performance_metrics()
        
        # Calculate overall score
        all_results["performance_score"] = self.calculate_performance_score(all_results)
        
        # Add system information
        process = psutil.Process()
        all_results["system_info"] = {
            "memory_usage_mb": round(process.memory_info().rss / 1024 / 1024, 2),
            "cpu_percent": round(process.cpu_percent(), 2),
            "memory_growth_mb": round((process.memory_info().rss / 1024 / 1024) - self.start_memory, 2),
            "benchmark_duration": time.time() - (time.time() - 300)  # Approximate
        }
        
        logger.info("Comprehensive benchmark completed!")
        return all_results


async def main():
    """Run the performance benchmark."""
    print("🚀 CastMatch AI Service - Performance Benchmark Suite")
    print("=" * 60)
    
    async with PerformanceBenchmark() as benchmark:
        results = await benchmark.run_comprehensive_benchmark()
        
        # Print summary
        print("\n📊 BENCHMARK RESULTS SUMMARY")
        print("=" * 60)
        
        if results.get("availability", {}).get("available"):
            print("✅ Service Status: AVAILABLE")
            
            score_data = results.get("performance_score", {})
            print(f"🎯 Overall Score: {score_data.get('overall_score', 0)}/100 (Grade: {score_data.get('grade', 'N/A')})")
            
            chat_perf = results.get("chat_performance", {})
            if chat_perf.get("response_times"):
                print(f"⚡ Avg Response Time: {chat_perf['response_times']['avg_ms']}ms")
                print(f"📈 P95 Response Time: {chat_perf['response_times']['p95_ms']}ms")
                print(f"📊 Requests/Second: {chat_perf.get('requests_per_second', 0)}")
            
            cache_perf = results.get("caching_performance", {})
            if cache_perf:
                print(f"💾 Cache Improvement: {cache_perf.get('cache_improvement_percent', 0)}%")
            
            memory_info = results.get("system_info", {})
            if memory_info:
                print(f"🧠 Memory Usage: {memory_info.get('memory_usage_mb', 0)}MB")
                print(f"📊 Memory Growth: {memory_info.get('memory_growth_mb', 0)}MB")
            
            # Print issues if any
            issues = score_data.get("issues", [])
            if issues:
                print("\n⚠️  PERFORMANCE ISSUES:")
                for issue in issues:
                    print(f"   • {issue}")
            
            # Production readiness assessment
            summary = score_data.get("summary", {})
            print(f"\n🏭 Production Ready: {'✅ YES' if summary.get('production_ready') else '❌ NO'}")
            
        else:
            print("❌ Service Status: UNAVAILABLE")
            error = results.get("availability", {}).get("error")
            if error:
                print(f"   Error: {error}")
        
        print("\n" + "=" * 60)
        
        # Save detailed results
        with open("performance_benchmark_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)
        print("📁 Detailed results saved to: performance_benchmark_results.json")


if __name__ == "__main__":
    asyncio.run(main())
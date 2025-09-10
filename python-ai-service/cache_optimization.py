#!/usr/bin/env python3
"""
Production Model Cache Optimization for CastMatch ML Service
Implements high-performance caching strategies for ML model embeddings and results
"""

import asyncio
import time
import json
import hashlib
import pickle
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from loguru import logger


class CacheStrategy(Enum):
    """Cache strategy enumeration."""
    LRU = "lru"
    LFU = "lfu"
    TTL = "ttl"
    HYBRID = "hybrid"


@dataclass
class CacheItem:
    """Cache item with metadata."""
    key: str
    value: Any
    created_at: float
    last_accessed: float
    access_count: int
    size_bytes: int
    ttl_seconds: Optional[int] = None
    
    def is_expired(self) -> bool:
        """Check if item has expired."""
        if self.ttl_seconds is None:
            return False
        return time.time() - self.created_at > self.ttl_seconds
    
    def age_seconds(self) -> float:
        """Get item age in seconds."""
        return time.time() - self.created_at


class HighPerformanceCache:
    """High-performance in-memory cache with advanced optimization strategies."""
    
    def __init__(
        self,
        max_size_mb: int = 512,  # 512MB max size
        strategy: CacheStrategy = CacheStrategy.HYBRID,
        default_ttl: int = 3600,  # 1 hour default TTL
        cleanup_threshold: float = 0.8  # Cleanup when 80% full
    ):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.strategy = strategy
        self.default_ttl = default_ttl
        self.cleanup_threshold = cleanup_threshold
        
        # Cache storage
        self.cache: Dict[str, CacheItem] = {}
        self.total_size_bytes = 0
        
        # Performance metrics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.cleanup_runs = 0
        
        # Cache warming data
        self.warming_queries = [
            "experienced actors Mumbai bollywood",
            "classical dancers bharatanatyam",
            "voice actors hindi dubbing",
            "method actors theater background",
            "action heroes martial arts",
            "fresh faces newcomers",
            "character actors regional languages",
            "senior actors emotional range"
        ]
        
        logger.info(f"Initialized cache with {max_size_mb}MB capacity, strategy: {strategy.value}")
    
    def _generate_cache_key(self, prefix: str, data: Union[str, Dict, List]) -> str:
        """Generate consistent cache key."""
        if isinstance(data, str):
            content = data
        else:
            content = json.dumps(data, sort_keys=True)
        
        hash_value = hashlib.md5(content.encode()).hexdigest()
        return f"{prefix}:{hash_value[:16]}"
    
    def _calculate_size(self, value: Any) -> int:
        """Estimate size of cached value."""
        try:
            if isinstance(value, (str, int, float, bool)):
                return len(str(value))
            elif isinstance(value, (list, dict)):
                return len(json.dumps(value))
            elif isinstance(value, np.ndarray):
                return value.nbytes
            else:
                return len(pickle.dumps(value))
        except Exception:
            return 1024  # Default size estimate
    
    def _should_evict(self) -> bool:
        """Check if cache should trigger eviction."""
        return self.total_size_bytes > (self.max_size_bytes * self.cleanup_threshold)
    
    def _evict_items(self, target_reduction_ratio: float = 0.2):
        """Evict items based on strategy."""
        if not self.cache:
            return
            
        target_size = int(self.total_size_bytes * target_reduction_ratio)
        current_time = time.time()
        
        # Get items sorted by eviction criteria
        if self.strategy == CacheStrategy.LRU:
            # Least Recently Used
            items = sorted(self.cache.items(), key=lambda x: x[1].last_accessed)
        elif self.strategy == CacheStrategy.LFU:
            # Least Frequently Used
            items = sorted(self.cache.items(), key=lambda x: x[1].access_count)
        elif self.strategy == CacheStrategy.TTL:
            # Expired items first, then oldest
            items = sorted(self.cache.items(), 
                         key=lambda x: (not x[1].is_expired(), x[1].created_at))
        else:  # HYBRID
            # Composite score: expired + age + frequency
            def hybrid_score(item):
                cache_item = item[1]
                expired_penalty = 1000 if cache_item.is_expired() else 0
                age_score = cache_item.age_seconds() / 3600  # Hours
                frequency_score = 1.0 / max(1, cache_item.access_count)
                return expired_penalty + age_score + frequency_score
                
            items = sorted(self.cache.items(), key=hybrid_score, reverse=True)
        
        # Remove items until target size is reached
        freed_size = 0
        evicted_count = 0
        
        for key, item in items:
            if freed_size >= target_size and not item.is_expired():
                break
                
            self.total_size_bytes -= item.size_bytes
            freed_size += item.size_bytes
            del self.cache[key]
            evicted_count += 1
        
        self.evictions += evicted_count
        self.cleanup_runs += 1
        
        logger.info(f"Cache cleanup: evicted {evicted_count} items, freed {freed_size/1024/1024:.2f}MB")
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache."""
        if key not in self.cache:
            self.misses += 1
            return None
            
        item = self.cache[key]
        
        # Check expiration
        if item.is_expired():
            del self.cache[key]
            self.total_size_bytes -= item.size_bytes
            self.misses += 1
            return None
        
        # Update access statistics
        item.last_accessed = time.time()
        item.access_count += 1
        self.hits += 1
        
        return item.value
    
    def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Put item in cache."""
        current_time = time.time()
        size = self._calculate_size(value)
        
        # Check if item would exceed cache size
        if size > self.max_size_bytes:
            logger.warning(f"Item too large for cache: {size/1024/1024:.2f}MB")
            return False
        
        # Remove existing item if present
        if key in self.cache:
            old_item = self.cache[key]
            self.total_size_bytes -= old_item.size_bytes
        
        # Evict items if needed
        if self.total_size_bytes + size > self.max_size_bytes or self._should_evict():
            self._evict_items()
        
        # Create cache item
        cache_item = CacheItem(
            key=key,
            value=value,
            created_at=current_time,
            last_accessed=current_time,
            access_count=1,
            size_bytes=size,
            ttl_seconds=ttl or self.default_ttl
        )
        
        # Store in cache
        self.cache[key] = cache_item
        self.total_size_bytes += size
        
        return True
    
    def get_embedding_cache_key(self, query: str, model_version: str = "v1") -> str:
        """Generate cache key for embeddings."""
        return self._generate_cache_key(f"embedding:{model_version}", query.lower().strip())
    
    def get_search_results_key(self, query: str, filters: Dict[str, Any] = None) -> str:
        """Generate cache key for search results."""
        data = {"query": query.lower().strip(), "filters": filters or {}}
        return self._generate_cache_key("search_results", data)
    
    def get_similarity_key(self, query_embedding: List[float], top_k: int = 10) -> str:
        """Generate cache key for similarity search."""
        # Use first and last few dimensions for key generation (performance optimization)
        embedding_sample = query_embedding[:5] + query_embedding[-5:]
        data = {"embedding_sample": embedding_sample, "top_k": top_k}
        return self._generate_cache_key("similarity", data)
    
    def cache_embedding(self, query: str, embedding: List[float], model_version: str = "v1") -> bool:
        """Cache query embedding."""
        key = self.get_embedding_cache_key(query, model_version)
        return self.put(key, embedding, ttl=7200)  # 2 hours for embeddings
    
    def get_cached_embedding(self, query: str, model_version: str = "v1") -> Optional[List[float]]:
        """Get cached embedding."""
        key = self.get_embedding_cache_key(query, model_version)
        return self.get(key)
    
    def cache_search_results(self, query: str, results: List[Dict[str, Any]], filters: Dict[str, Any] = None) -> bool:
        """Cache search results."""
        key = self.get_search_results_key(query, filters)
        return self.put(key, results, ttl=1800)  # 30 minutes for search results
    
    def get_cached_search_results(self, query: str, filters: Dict[str, Any] = None) -> Optional[List[Dict[str, Any]]]:
        """Get cached search results."""
        key = self.get_search_results_key(query, filters)
        return self.get(key)
    
    async def warm_cache(self) -> Dict[str, Any]:
        """Pre-populate cache with common queries."""
        logger.info("Starting cache warming...")
        warmed_count = 0
        
        for query in self.warming_queries:
            try:
                # Simulate embedding generation
                embedding = np.random.random(384).tolist()  # Typical sentence-transformer size
                
                # Cache the embedding
                if self.cache_embedding(query, embedding, "v1"):
                    warmed_count += 1
                
                # Simulate search results
                results = [
                    {
                        "id": f"talent_{i}",
                        "name": f"Mumbai Talent {i}",
                        "score": 95 - (i * 2),
                        "location": "Mumbai",
                        "skills": ["Acting", "Dancing"]
                    }
                    for i in range(5)
                ]
                
                # Cache search results
                self.cache_search_results(query, results)
                
                await asyncio.sleep(0.01)  # Small delay to prevent overwhelming
                
            except Exception as e:
                logger.error(f"Cache warming error for query '{query}': {e}")
        
        logger.info(f"Cache warming complete: {warmed_count} queries cached")
        
        return {
            "warmed_queries": warmed_count,
            "cache_size_mb": self.total_size_bytes / 1024 / 1024,
            "hit_rate": self.get_hit_rate()
        }
    
    def get_hit_rate(self) -> float:
        """Calculate cache hit rate."""
        total_requests = self.hits + self.misses
        return (self.hits / total_requests * 100) if total_requests > 0 else 0.0
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        current_time = time.time()
        
        # Analyze cache contents
        expired_items = sum(1 for item in self.cache.values() if item.is_expired())
        avg_age = np.mean([item.age_seconds() for item in self.cache.values()]) if self.cache else 0
        avg_access_count = np.mean([item.access_count for item in self.cache.values()]) if self.cache else 0
        
        return {
            "performance": {
                "hit_rate_percent": round(self.get_hit_rate(), 2),
                "hits": self.hits,
                "misses": self.misses,
                "evictions": self.evictions,
                "cleanup_runs": self.cleanup_runs
            },
            "storage": {
                "total_items": len(self.cache),
                "size_mb": round(self.total_size_bytes / 1024 / 1024, 2),
                "max_size_mb": round(self.max_size_bytes / 1024 / 1024, 2),
                "utilization_percent": round((self.total_size_bytes / self.max_size_bytes) * 100, 2)
            },
            "content_analysis": {
                "expired_items": expired_items,
                "avg_age_seconds": round(avg_age, 2),
                "avg_access_count": round(avg_access_count, 2)
            },
            "configuration": {
                "strategy": self.strategy.value,
                "default_ttl_seconds": self.default_ttl,
                "cleanup_threshold_percent": round(self.cleanup_threshold * 100, 2)
            }
        }
    
    def clear(self):
        """Clear all cache items."""
        items_cleared = len(self.cache)
        size_cleared = self.total_size_bytes
        
        self.cache.clear()
        self.total_size_bytes = 0
        
        logger.info(f"Cache cleared: {items_cleared} items, {size_cleared/1024/1024:.2f}MB freed")
    
    def optimize(self) -> Dict[str, Any]:
        """Run cache optimization."""
        initial_size = self.total_size_bytes
        initial_items = len(self.cache)
        
        # Force cleanup of expired items
        expired_removed = 0
        for key in list(self.cache.keys()):
            if self.cache[key].is_expired():
                item = self.cache[key]
                self.total_size_bytes -= item.size_bytes
                del self.cache[key]
                expired_removed += 1
        
        # Run eviction if needed
        if self._should_evict():
            self._evict_items()
        
        optimization_result = {
            "items_before": initial_items,
            "items_after": len(self.cache),
            "size_before_mb": round(initial_size / 1024 / 1024, 2),
            "size_after_mb": round(self.total_size_bytes / 1024 / 1024, 2),
            "expired_removed": expired_removed,
            "space_freed_mb": round((initial_size - self.total_size_bytes) / 1024 / 1024, 2)
        }
        
        logger.info(f"Cache optimization: {optimization_result}")
        return optimization_result


# Global cache instance
production_cache = HighPerformanceCache(
    max_size_mb=512,
    strategy=CacheStrategy.HYBRID,
    default_ttl=3600,
    cleanup_threshold=0.85
)


async def benchmark_cache_performance(cache: HighPerformanceCache, iterations: int = 1000) -> Dict[str, Any]:
    """Benchmark cache performance."""
    logger.info(f"Starting cache performance benchmark ({iterations} iterations)")
    
    # Test data
    test_queries = [
        f"Find actors in Mumbai for project {i}" 
        for i in range(iterations // 10)
    ]
    
    # Benchmark write performance
    write_start = time.time()
    write_successes = 0
    
    for i in range(iterations):
        query = test_queries[i % len(test_queries)]
        embedding = np.random.random(384).tolist()
        
        if cache.cache_embedding(query, embedding):
            write_successes += 1
    
    write_time = time.time() - write_start
    
    # Benchmark read performance
    read_start = time.time()
    read_hits = 0
    
    for i in range(iterations):
        query = test_queries[i % len(test_queries)]
        if cache.get_cached_embedding(query) is not None:
            read_hits += 1
    
    read_time = time.time() - read_start
    
    return {
        "iterations": iterations,
        "write_performance": {
            "total_time_seconds": round(write_time, 4),
            "writes_per_second": round(iterations / write_time, 2),
            "success_rate_percent": round((write_successes / iterations) * 100, 2)
        },
        "read_performance": {
            "total_time_seconds": round(read_time, 4),
            "reads_per_second": round(iterations / read_time, 2),
            "hit_rate_percent": round((read_hits / iterations) * 100, 2)
        },
        "cache_stats": cache.get_statistics()
    }


async def main():
    """Demo cache optimization."""
    print("=== CastMatch Production Cache Optimization Demo ===")
    
    # Initialize cache
    cache = HighPerformanceCache(max_size_mb=100, strategy=CacheStrategy.HYBRID)
    
    # Warm cache
    print("\n1. Cache Warming...")
    warming_result = await cache.warm_cache()
    print(f"Warmed {warming_result['warmed_queries']} queries")
    print(f"Hit rate: {warming_result['hit_rate']:.2f}%")
    
    # Benchmark performance
    print("\n2. Performance Benchmark...")
    benchmark_result = await benchmark_cache_performance(cache, 500)
    print(f"Write Performance: {benchmark_result['write_performance']['writes_per_second']} writes/sec")
    print(f"Read Performance: {benchmark_result['read_performance']['reads_per_second']} reads/sec")
    print(f"Cache Hit Rate: {benchmark_result['read_performance']['hit_rate_percent']}%")
    
    # Show statistics
    print("\n3. Cache Statistics:")
    stats = cache.get_statistics()
    print(json.dumps(stats, indent=2))
    
    # Optimization
    print("\n4. Cache Optimization...")
    optimization_result = cache.optimize()
    print(f"Freed {optimization_result['space_freed_mb']}MB")


if __name__ == "__main__":
    asyncio.run(main())
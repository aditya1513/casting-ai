"""High-performance caching service with Redis integration for AI/ML optimization."""

import json
import hashlib
import asyncio
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta
import numpy as np
from loguru import logger
import aioredis
from cachetools import TTLCache, LRUCache
import pickle
import gzip
import orjson
from contextlib import asynccontextmanager

from app.core.config import settings


class CacheService:
    """High-performance caching service for AI/ML operations."""
    
    def __init__(self):
        """Initialize cache service with Redis and in-memory caches."""
        self.redis_client: Optional[aioredis.Redis] = None
        
        # In-memory caches for ultra-fast access
        self.embedding_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour TTL
        self.model_response_cache = TTLCache(maxsize=500, ttl=1800)  # 30 min TTL
        self.conversation_cache = TTLCache(maxsize=200, ttl=7200)  # 2 hours TTL
        self.vector_search_cache = LRUCache(maxsize=300)
        
        # Performance metrics
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'redis_hits': 0,
            'redis_misses': 0,
            'embedding_cache_hits': 0,
            'model_cache_hits': 0,
            'conversation_cache_hits': 0,
            'vector_search_cache_hits': 0
        }
        
        self.initialized = False
        
    async def initialize(self):
        """Initialize Redis connection."""
        try:
            if hasattr(settings, 'redis_url') and settings.redis_url:
                self.redis_client = aioredis.from_url(
                    settings.redis_url,
                    encoding="utf-8",
                    decode_responses=False,  # We'll handle encoding manually
                    socket_connect_timeout=5,
                    socket_keepalive=True,
                    socket_keepalive_options={},
                    health_check_interval=30
                )
                # Test connection
                await self.redis_client.ping()
                logger.info("Redis cache initialized successfully")
            else:
                logger.warning("Redis URL not configured, using in-memory cache only")
            
            self.initialized = True
            
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. Using in-memory cache only.")
            self.redis_client = None
            self.initialized = True
    
    def _generate_cache_key(self, prefix: str, data: Union[str, Dict, List]) -> str:
        """Generate a deterministic cache key."""
        if isinstance(data, str):
            content = data
        else:
            content = orjson.dumps(data, sort_keys=True).decode()
        
        key_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"{prefix}:{key_hash}"
    
    def _compress_data(self, data: Any) -> bytes:
        """Compress data for efficient storage."""
        try:
            # Use orjson for JSON serializable data, pickle for complex objects
            if isinstance(data, (dict, list, str, int, float, bool)) or data is None:
                serialized = orjson.dumps(data)
            elif isinstance(data, np.ndarray):
                # Special handling for numpy arrays
                serialized = pickle.dumps(data)
            else:
                serialized = pickle.dumps(data)
            
            # Compress if data is large enough
            if len(serialized) > 1024:  # Only compress if > 1KB
                return gzip.compress(serialized)
            return serialized
        except Exception as e:
            logger.error(f"Error compressing data: {e}")
            return pickle.dumps(data)
    
    def _decompress_data(self, compressed_data: bytes) -> Any:
        """Decompress data from storage."""
        try:
            # Try to decompress first
            try:
                decompressed = gzip.decompress(compressed_data)
            except:
                # Not compressed
                decompressed = compressed_data
            
            # Try orjson first, then pickle
            try:
                return orjson.loads(decompressed)
            except:
                return pickle.loads(decompressed)
        except Exception as e:
            logger.error(f"Error decompressing data: {e}")
            return None
    
    async def get_embedding(self, text: str) -> Optional[np.ndarray]:
        """Get cached embedding for text."""
        cache_key = self._generate_cache_key("embedding", text)
        
        # Check in-memory cache first
        if cache_key in self.embedding_cache:
            self.cache_stats['embedding_cache_hits'] += 1
            self.cache_stats['hits'] += 1
            return self.embedding_cache[cache_key]
        
        # Check Redis cache
        if self.redis_client:
            try:
                cached_data = await self.redis_client.get(f"embed:{cache_key}")
                if cached_data:
                    embedding = self._decompress_data(cached_data)
                    if embedding is not None:
                        # Store in memory cache for faster access
                        self.embedding_cache[cache_key] = embedding
                        self.cache_stats['redis_hits'] += 1
                        self.cache_stats['hits'] += 1
                        return embedding
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        self.cache_stats['misses'] += 1
        return None
    
    async def set_embedding(self, text: str, embedding: np.ndarray, ttl: int = 3600):
        """Cache embedding for text."""
        cache_key = self._generate_cache_key("embedding", text)
        
        # Store in memory cache
        self.embedding_cache[cache_key] = embedding
        
        # Store in Redis cache
        if self.redis_client:
            try:
                compressed_data = self._compress_data(embedding)
                await self.redis_client.setex(
                    f"embed:{cache_key}",
                    ttl,
                    compressed_data
                )
            except Exception as e:
                logger.error(f"Redis set error: {e}")
    
    async def get_model_response(self, prompt: str, model_config: Dict[str, Any]) -> Optional[str]:
        """Get cached model response."""
        cache_data = {"prompt": prompt, "config": model_config}
        cache_key = self._generate_cache_key("model", cache_data)
        
        # Check in-memory cache first
        if cache_key in self.model_response_cache:
            self.cache_stats['model_cache_hits'] += 1
            self.cache_stats['hits'] += 1
            return self.model_response_cache[cache_key]
        
        # Check Redis cache
        if self.redis_client:
            try:
                cached_response = await self.redis_client.get(f"model:{cache_key}")
                if cached_response:
                    response = self._decompress_data(cached_response)
                    if response is not None:
                        # Store in memory cache
                        self.model_response_cache[cache_key] = response
                        self.cache_stats['redis_hits'] += 1
                        self.cache_stats['hits'] += 1
                        return response
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        self.cache_stats['misses'] += 1
        return None
    
    async def set_model_response(self, prompt: str, model_config: Dict[str, Any], response: str, ttl: int = 1800):
        """Cache model response."""
        cache_data = {"prompt": prompt, "config": model_config}
        cache_key = self._generate_cache_key("model", cache_data)
        
        # Store in memory cache
        self.model_response_cache[cache_key] = response
        
        # Store in Redis cache
        if self.redis_client:
            try:
                compressed_data = self._compress_data(response)
                await self.redis_client.setex(
                    f"model:{cache_key}",
                    ttl,
                    compressed_data
                )
            except Exception as e:
                logger.error(f"Redis set error: {e}")
    
    async def get_conversation_context(self, session_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached conversation context."""
        cache_key = f"conv:{session_id}"
        
        # Check in-memory cache first
        if cache_key in self.conversation_cache:
            self.cache_stats['conversation_cache_hits'] += 1
            self.cache_stats['hits'] += 1
            return self.conversation_cache[cache_key]
        
        # Check Redis cache
        if self.redis_client:
            try:
                cached_context = await self.redis_client.get(cache_key)
                if cached_context:
                    context = self._decompress_data(cached_context)
                    if context is not None:
                        # Store in memory cache
                        self.conversation_cache[cache_key] = context
                        self.cache_stats['redis_hits'] += 1
                        self.cache_stats['hits'] += 1
                        return context
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        self.cache_stats['misses'] += 1
        return None
    
    async def set_conversation_context(self, session_id: str, context: List[Dict[str, Any]], ttl: int = 7200):
        """Cache conversation context with sliding window."""
        # Keep only last 10 messages for memory efficiency
        pruned_context = context[-10:] if len(context) > 10 else context
        
        cache_key = f"conv:{session_id}"
        
        # Store in memory cache
        self.conversation_cache[cache_key] = pruned_context
        
        # Store in Redis cache
        if self.redis_client:
            try:
                compressed_data = self._compress_data(pruned_context)
                await self.redis_client.setex(cache_key, ttl, compressed_data)
            except Exception as e:
                logger.error(f"Redis set error: {e}")
    
    async def get_vector_search_results(self, query: str, filters: Optional[Dict] = None) -> Optional[List[Dict]]:
        """Get cached vector search results."""
        cache_data = {"query": query, "filters": filters or {}}
        cache_key = self._generate_cache_key("vector", cache_data)
        
        # Check in-memory cache
        if cache_key in self.vector_search_cache:
            self.cache_stats['vector_search_cache_hits'] += 1
            self.cache_stats['hits'] += 1
            return self.vector_search_cache[cache_key]
        
        # Check Redis cache
        if self.redis_client:
            try:
                cached_results = await self.redis_client.get(f"search:{cache_key}")
                if cached_results:
                    results = self._decompress_data(cached_results)
                    if results is not None:
                        # Store in memory cache
                        self.vector_search_cache[cache_key] = results
                        self.cache_stats['redis_hits'] += 1
                        self.cache_stats['hits'] += 1
                        return results
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        self.cache_stats['misses'] += 1
        return None
    
    async def set_vector_search_results(self, query: str, filters: Optional[Dict], results: List[Dict], ttl: int = 600):
        """Cache vector search results."""
        cache_data = {"query": query, "filters": filters or {}}
        cache_key = self._generate_cache_key("vector", cache_data)
        
        # Store in memory cache
        self.vector_search_cache[cache_key] = results
        
        # Store in Redis cache
        if self.redis_client:
            try:
                compressed_data = self._compress_data(results)
                await self.redis_client.setex(
                    f"search:{cache_key}",
                    ttl,
                    compressed_data
                )
            except Exception as e:
                logger.error(f"Redis set error: {e}")
    
    async def batch_get_embeddings(self, texts: List[str]) -> Dict[str, Optional[np.ndarray]]:
        """Batch get embeddings for multiple texts."""
        results = {}
        cache_keys = []
        
        for text in texts:
            cache_key = self._generate_cache_key("embedding", text)
            cache_keys.append((text, cache_key))
            
            # Check in-memory cache first
            if cache_key in self.embedding_cache:
                results[text] = self.embedding_cache[cache_key]
                self.cache_stats['embedding_cache_hits'] += 1
                self.cache_stats['hits'] += 1
        
        # Check Redis for remaining texts
        if self.redis_client:
            remaining_keys = [(text, key) for text, key in cache_keys if text not in results]
            if remaining_keys:
                try:
                    redis_keys = [f"embed:{key}" for _, key in remaining_keys]
                    cached_values = await self.redis_client.mget(*redis_keys)
                    
                    for (text, cache_key), cached_data in zip(remaining_keys, cached_values):
                        if cached_data:
                            embedding = self._decompress_data(cached_data)
                            if embedding is not None:
                                results[text] = embedding
                                # Cache in memory for future access
                                self.embedding_cache[cache_key] = embedding
                                self.cache_stats['redis_hits'] += 1
                                self.cache_stats['hits'] += 1
                        else:
                            results[text] = None
                            self.cache_stats['misses'] += 1
                except Exception as e:
                    logger.error(f"Redis batch get error: {e}")
                    # Fill remaining with None
                    for text, _ in remaining_keys:
                        if text not in results:
                            results[text] = None
                            self.cache_stats['misses'] += 1
        else:
            # Fill remaining with None if no Redis
            for text, _ in cache_keys:
                if text not in results:
                    results[text] = None
                    self.cache_stats['misses'] += 1
        
        return results
    
    async def batch_set_embeddings(self, embeddings: Dict[str, np.ndarray], ttl: int = 3600):
        """Batch set embeddings for multiple texts."""
        # Store all in memory cache
        for text, embedding in embeddings.items():
            cache_key = self._generate_cache_key("embedding", text)
            self.embedding_cache[cache_key] = embedding
        
        # Store in Redis
        if self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                for text, embedding in embeddings.items():
                    cache_key = self._generate_cache_key("embedding", text)
                    compressed_data = self._compress_data(embedding)
                    pipe.setex(f"embed:{cache_key}", ttl, compressed_data)
                await pipe.execute()
            except Exception as e:
                logger.error(f"Redis batch set error: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics."""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self.cache_stats,
            'hit_rate_percent': round(hit_rate, 2),
            'total_requests': total_requests,
            'memory_cache_sizes': {
                'embedding_cache': len(self.embedding_cache),
                'model_response_cache': len(self.model_response_cache),
                'conversation_cache': len(self.conversation_cache),
                'vector_search_cache': len(self.vector_search_cache)
            }
        }
    
    def clear_cache(self, cache_type: Optional[str] = None):
        """Clear cache by type or all caches."""
        if cache_type == 'embedding' or cache_type is None:
            self.embedding_cache.clear()
        if cache_type == 'model' or cache_type is None:
            self.model_response_cache.clear()
        if cache_type == 'conversation' or cache_type is None:
            self.conversation_cache.clear()
        if cache_type == 'vector' or cache_type is None:
            self.vector_search_cache.clear()
        
        logger.info(f"Cleared cache: {cache_type or 'all'}")
    
    async def invalidate_redis_pattern(self, pattern: str):
        """Invalidate Redis keys matching a pattern."""
        if self.redis_client:
            try:
                keys = await self.redis_client.keys(pattern)
                if keys:
                    await self.redis_client.delete(*keys)
                    logger.info(f"Invalidated {len(keys)} Redis keys matching pattern: {pattern}")
            except Exception as e:
                logger.error(f"Error invalidating Redis pattern {pattern}: {e}")
    
    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()


# Create singleton instance
cache_service = CacheService()


# Context manager for cache initialization
@asynccontextmanager
async def get_cache_service():
    """Get initialized cache service."""
    if not cache_service.initialized:
        await cache_service.initialize()
    try:
        yield cache_service
    finally:
        pass  # Keep connection open for reuse
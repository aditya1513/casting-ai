"""Rate limiting utilities for API endpoints."""

from fastapi import HTTPException
from functools import wraps
from typing import Dict, Callable
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio
from loguru import logger


class RateLimiter:
    """Token bucket rate limiter implementation."""
    
    def __init__(self):
        self.buckets: Dict[str, Dict] = defaultdict(lambda: {
            "tokens": 0,
            "last_refill": datetime.utcnow()
        })
        self.locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
    
    async def check_rate_limit(
        self,
        key: str,
        max_calls: int,
        time_window: int
    ) -> bool:
        """
        Check if request is within rate limit.
        
        Args:
            key: Unique identifier (IP, user_id, etc.)
            max_calls: Maximum calls allowed
            time_window: Time window in seconds
            
        Returns:
            True if within limit, False otherwise
        """
        async with self.locks[key]:
            now = datetime.utcnow()
            bucket = self.buckets[key]
            
            # Calculate time elapsed
            time_elapsed = (now - bucket["last_refill"]).total_seconds()
            
            # Refill tokens based on time elapsed
            tokens_to_add = (time_elapsed / time_window) * max_calls
            bucket["tokens"] = min(max_calls, bucket["tokens"] + tokens_to_add)
            bucket["last_refill"] = now
            
            # Check if we have tokens available
            if bucket["tokens"] >= 1:
                bucket["tokens"] -= 1
                return True
            
            return False
    
    def get_reset_time(self, key: str, time_window: int) -> int:
        """Get seconds until rate limit resets."""
        bucket = self.buckets.get(key)
        if not bucket:
            return 0
        
        time_until_token = time_window - (datetime.utcnow() - bucket["last_refill"]).total_seconds()
        return max(0, int(time_until_token))


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_calls: int = 100, time_window: int = 60):
    """
    Decorator for rate limiting API endpoints.
    
    Args:
        max_calls: Maximum number of calls allowed
        time_window: Time window in seconds
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to get user ID from kwargs, fallback to IP
            from fastapi import Request
            
            # Find Request object in args
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            # Get rate limit key (user_id or IP)
            current_user = kwargs.get("current_user")
            if current_user and current_user.get("id"):
                key = f"user:{current_user['id']}"
            elif request:
                key = f"ip:{request.client.host}"
            else:
                key = "global"
            
            # Check rate limit
            allowed = await rate_limiter.check_rate_limit(key, max_calls, time_window)
            
            if not allowed:
                reset_time = rate_limiter.get_reset_time(key, time_window)
                logger.warning(f"Rate limit exceeded for {key}")
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Try again in {reset_time} seconds.",
                    headers={"Retry-After": str(reset_time)}
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


class IPRateLimiter:
    """IP-based rate limiter for public endpoints."""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)
        self.locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
    
    async def check_ip_limit(self, ip: str) -> bool:
        """Check if IP is within rate limit."""
        async with self.locks[ip]:
            now = datetime.utcnow()
            
            # Remove old requests outside window
            cutoff_time = now - timedelta(seconds=self.window_seconds)
            self.requests[ip] = [
                req_time for req_time in self.requests[ip]
                if req_time > cutoff_time
            ]
            
            # Check if under limit
            if len(self.requests[ip]) < self.max_requests:
                self.requests[ip].append(now)
                return True
            
            return False
    
    def get_remaining_requests(self, ip: str) -> int:
        """Get remaining requests for IP."""
        now = datetime.utcnow()
        cutoff_time = now - timedelta(seconds=self.window_seconds)
        
        recent_requests = [
            req_time for req_time in self.requests.get(ip, [])
            if req_time > cutoff_time
        ]
        
        return max(0, self.max_requests - len(recent_requests))


# Global IP rate limiter
ip_rate_limiter = IPRateLimiter()


async def check_ip_rate_limit(request):
    """
    Middleware to check IP-based rate limiting.
    
    Args:
        request: FastAPI Request object
    """
    ip = request.client.host
    
    if not await ip_rate_limiter.check_ip_limit(ip):
        remaining = ip_rate_limiter.get_remaining_requests(ip)
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests from this IP. Remaining: {remaining}",
            headers={"X-RateLimit-Remaining": str(remaining)}
        )
    
    return True
"""Optimized AI service with high-performance caching, FAISS indexing, and monitoring."""

import asyncio
import os
import time
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from loguru import logger
from dotenv import load_dotenv

# Import our optimized services
from app.services.cache_service import cache_service
from app.services.vector_service_optimized import optimized_vector_service
from app.services.ai_service_optimized import optimized_ai_service
from app.performance.metrics import metrics_collector, AsyncPerformanceMonitor

# Load environment variables
load_dotenv()


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str = Field(..., min_length=1, max_length=2000)
    user_id: str = Field(default="anonymous", max_length=100)
    session_id: str = Field(default="default", max_length=100)
    search_criteria: Optional[Dict[str, Any]] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=500, ge=1, le=2000)


class ChatResponse(BaseModel):
    """Chat response model."""
    message: str
    talents: List[Dict[str, Any]] = []
    suggestions: List[str] = []
    action_type: str = "general"
    service: str = "python-ai-service-optimized"
    status: str = "success"
    performance: Dict[str, Any] = {}
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    uptime_seconds: float
    performance: Dict[str, Any]
    timestamp: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting optimized AI service...")
    
    try:
        # Initialize services
        logger.info("Initializing cache service...")
        await cache_service.initialize()
        
        logger.info("Initializing optimized vector service...")
        await optimized_vector_service.initialize()
        
        logger.info("Starting metrics collection...")
        await metrics_collector.start_background_collection(interval=30.0)
        
        logger.info("All services initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise
    finally:
        logger.info("Shutting down optimized AI service...")
        
        # Clean shutdown
        await metrics_collector.stop_background_collection()
        await optimized_ai_service.close()
        await cache_service.close()
        
        logger.info("Shutdown complete")


# Create FastAPI app with lifespan management
app = FastAPI(
    title="CastMatch AI Service - Optimized",
    version="2.0.0",
    description="High-performance AI-powered talent search service with advanced caching and vector indexing",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global request ID for tracking
request_counter = 0


def get_request_id():
    """Generate unique request ID."""
    global request_counter
    request_counter += 1
    return f"req_{int(time.time())}_{request_counter}"


@app.get("/", response_model=Dict[str, str])
async def root() -> Dict[str, str]:
    """Root endpoint with service information."""
    return {
        "message": "Welcome to CastMatch AI Service (Optimized)",
        "version": "2.0.0",
        "features": [
            "High-performance vector search with FAISS",
            "Advanced caching with Redis",
            "Memory management and optimization",
            "Real-time performance monitoring",
            "Prometheus metrics export"
        ],
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
        "performance": "/performance"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Comprehensive health check endpoint."""
    async with AsyncPerformanceMonitor("health_check", "health"):
        try:
            # Get performance metrics
            performance_data = optimized_ai_service.get_performance_metrics()
            health_data = await metrics_collector.health_check()
            
            # Calculate uptime
            uptime = time.time() - metrics_collector.start_time
            
            status = "healthy"
            if health_data.get("status") != "healthy":
                status = health_data.get("status", "unknown")
            
            return HealthResponse(
                status=status,
                service="CastMatch AI Service - Optimized",
                version="2.0.0",
                uptime_seconds=uptime,
                performance=performance_data,
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            )
            
        except Exception as e:
            logger.error(f"Health check error: {e}")
            raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.get("/metrics")
async def metrics_endpoint():
    """Prometheus metrics endpoint."""
    try:
        metrics_data = metrics_collector.export_prometheus_metrics()
        return PlainTextResponse(
            content=metrics_data,
            media_type=metrics_collector.get_prometheus_content_type()
        )
    except Exception as e:
        logger.error(f"Metrics export error: {e}")
        raise HTTPException(status_code=500, detail="Metrics export failed")


@app.get("/performance")
async def performance_endpoint() -> Dict[str, Any]:
    """Detailed performance report endpoint."""
    async with AsyncPerformanceMonitor("performance_report", "performance"):
        try:
            return {
                "service_metrics": optimized_ai_service.get_performance_metrics(),
                "system_metrics": metrics_collector.get_performance_report(),
                "cache_metrics": cache_service.get_cache_stats(),
                "vector_metrics": optimized_vector_service.get_performance_metrics()
            }
        except Exception as e:
            logger.error(f"Performance report error: {e}")
            raise HTTPException(status_code=500, detail="Performance report failed")


@app.post("/chat", response_model=ChatResponse)
async def optimized_chat(request: ChatRequest) -> ChatResponse:
    """
    Optimized chat endpoint with advanced AI capabilities.
    Features:
    - High-performance vector search
    - Advanced caching
    - Memory management
    - Real-time performance monitoring
    """
    request_id = get_request_id()
    
    async with AsyncPerformanceMonitor("chat_request", "chat"):
        try:
            start_time = time.time()
            
            logger.info(f"[{request_id}] Processing chat from user {request.user_id}: {request.message[:100]}...")
            
            # Check if this is a talent search request
            is_talent_search = any(
                keyword in request.message.lower()
                for keyword in ['find', 'search', 'looking for', 'need', 'talent', 'actor', 'actress', 'casting']
            )
            
            talents = []
            suggestions = []
            action_type = "general"
            
            if is_talent_search:
                try:
                    # Use optimized vector search
                    if optimized_vector_service.model_loaded:
                        # Convert search criteria to filters
                        filters = {}
                        if request.search_criteria:
                            if request.search_criteria.get('location'):
                                filters['location'] = request.search_criteria['location']
                            if request.search_criteria.get('gender'):
                                filters['gender'] = request.search_criteria['gender']
                            if request.search_criteria.get('min_age'):
                                filters['min_age'] = request.search_criteria['min_age']
                            if request.search_criteria.get('max_age'):
                                filters['max_age'] = request.search_criteria['max_age']
                        
                        # Perform vector search
                        search_results = await optimized_vector_service.search_similar_talents(
                            query=request.message,
                            filters=filters,
                            top_k=10
                        )
                        
                        # Convert results to response format
                        talents = [
                            {
                                "id": result.get('talent_id'),
                                "name": result.get('name'),
                                "location": result.get('location'),
                                "skills": result.get('skills', []),
                                "experience": result.get('experience'),
                                "score": round(result.get('score', 0) * 100, 1),
                                "match_reason": f"Vector similarity: {result.get('score', 0):.3f}"
                            }
                            for result in search_results
                        ]
                        
                        action_type = "talent_search"
                        
                        # Record cache metrics
                        if search_results:
                            metrics_collector.record_cache_hit("vector_search")
                        else:
                            metrics_collector.record_cache_miss("vector_search")
                        
                except Exception as search_error:
                    logger.error(f"Vector search error: {search_error}")
                    # Continue with general chat response
            
            # Generate AI response with context
            if talents:
                ai_message = f"Great! I found {len(talents)} talents that match your criteria. Here are the top recommendations based on vector similarity analysis."
                suggestions = [
                    "View detailed talent profiles",
                    "Schedule auditions with top matches",
                    "Request self-tapes from selected talents",
                    "Refine search with additional criteria",
                    "Save this search for later"
                ]
            else:
                ai_message = f"I understand you're looking for talent. Let me help you find the perfect match. Could you provide more specific details about the role requirements?"
                suggestions = [
                    "Try: 'Find actors in Mumbai aged 25-35 for romantic lead'",
                    "Or: 'Looking for experienced dancers for Bollywood film'",
                    "Or: 'Need character actors with theater background'",
                    "Browse all available talents",
                    "Post a detailed casting call"
                ]
            
            # Calculate response time
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Update performance metrics
            metrics_collector.record_metric("chat.response_time", response_time)
            if is_talent_search:
                metrics_collector.record_metric("chat.talent_search.count", 1, unit="count")
            
            # Get performance data for response
            performance_data = {
                "response_time_ms": round(response_time, 2),
                "vector_search_used": is_talent_search and optimized_vector_service.model_loaded,
                "results_cached": False,  # Could be tracked more precisely
                "service_version": "optimized_v2.0"
            }
            
            logger.info(f"[{request_id}] Chat processed in {response_time:.1f}ms, found {len(talents)} talents")
            
            return ChatResponse(
                message=ai_message,
                talents=talents,
                suggestions=suggestions,
                action_type=action_type,
                service="python-ai-service-optimized",
                status="success",
                performance=performance_data
            )
            
        except Exception as e:
            logger.error(f"[{request_id}] Error in optimized chat: {e}")
            
            # Record error metrics
            metrics_collector.record_metric("chat.errors", 1, unit="count")
            
            return ChatResponse(
                message=f"I encountered an error while processing your request: {str(e)}. Please try again with different criteria.",
                talents=[],
                suggestions=["Try again with simpler criteria", "Contact support if issue persists"],
                action_type="error",
                service="python-ai-service-optimized",
                status="error",
                error=str(e),
                performance={"error": True}
            )


@app.post("/index-talent")
async def index_talent(talent_data: Dict[str, Any]) -> Dict[str, Any]:
    """Index a talent profile for vector search."""
    async with AsyncPerformanceMonitor("index_talent", "index"):
        try:
            success = await optimized_vector_service.index_talent(talent_data)
            
            if success:
                metrics_collector.record_metric("indexing.success", 1, unit="count")
                return {
                    "status": "success",
                    "message": f"Successfully indexed talent: {talent_data.get('name', 'Unknown')}",
                    "talent_id": talent_data.get('id')
                }
            else:
                metrics_collector.record_metric("indexing.failures", 1, unit="count")
                return {
                    "status": "error",
                    "message": "Failed to index talent",
                    "talent_id": talent_data.get('id')
                }
                
        except Exception as e:
            logger.error(f"Error indexing talent: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-index-talents")
async def batch_index_talents(talents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Batch index multiple talent profiles."""
    async with AsyncPerformanceMonitor("batch_index", "batch_index"):
        try:
            indexed_count = await optimized_vector_service.batch_index_talents(talents)
            
            metrics_collector.record_metric("batch_indexing.count", indexed_count, unit="count")
            metrics_collector.update_vector_count(optimized_vector_service.metrics['total_vectors'])
            
            return {
                "status": "success",
                "indexed_count": indexed_count,
                "total_provided": len(talents),
                "success_rate": round((indexed_count / len(talents)) * 100, 1) if talents else 0
            }
            
        except Exception as e:
            logger.error(f"Error in batch indexing: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/cache-stats")
async def cache_stats() -> Dict[str, Any]:
    """Get cache performance statistics."""
    try:
        return cache_service.get_cache_stats()
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clear-cache")
async def clear_cache(cache_type: Optional[str] = None) -> Dict[str, Any]:
    """Clear cache (specific type or all)."""
    try:
        cache_service.clear_cache(cache_type)
        
        # Also clear old metrics
        cleared_metrics = metrics_collector.clear_metrics(older_than_minutes=60)
        
        return {
            "status": "success",
            "message": f"Cleared {cache_type or 'all'} cache(s)",
            "cleared_metrics": cleared_metrics
        }
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    # Configure logging
    logger.info("Starting CastMatch AI Service - Optimized v2.0")
    
    port = int(os.getenv("PORT", 8001))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Service will run on http://{host}:{port}")
    logger.info("Features enabled:")
    logger.info("  ✓ High-performance vector search (FAISS)")
    logger.info("  ✓ Advanced caching (Redis + in-memory)")
    logger.info("  ✓ Memory management and optimization")
    logger.info("  ✓ Real-time performance monitoring")
    logger.info("  ✓ Prometheus metrics export")
    logger.info("  ✓ Batch processing capabilities")
    
    uvicorn.run(
        "optimized_app:app",
        host=host,
        port=port,
        reload=False,  # Disable reload for production
        log_level="info",
        access_log=True
    )
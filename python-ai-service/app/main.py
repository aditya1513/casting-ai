"""Main FastAPI application for CastMatch AI Service."""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys
from typing import Dict, Any

from app.core.config import settings
from app.database.connection import async_db
from app.services.ai_service import ai_service
from app.schemas.talent import (
    TalentSearchCriteria,
    SearchResponse,
    ChatRequest,
    ChatResponse,
    TalentDetail,
    TalentRecommendation
)

# Import routers
from app.api.conversation_routes import router as conversation_router
from app.api.memory_routes import router as memory_router
from app.api.search_routes import router as search_router
from app.api.talent_matching_routes import router as talent_matching_router

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level=settings.log_level
)
logger.add(
    "logs/app.log",
    rotation="500 MB",
    retention="10 days",
    level=settings.log_level
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting CastMatch AI Service...")
    
    # Connect to database
    try:
        await async_db.connect()
        logger.info("Connected to PostgreSQL database")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down CastMatch AI Service...")
    await async_db.disconnect()


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered talent search and recommendation service for CastMatch",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(conversation_router)
app.include_router(memory_router)
app.include_router(search_router)
app.include_router(talent_matching_router)


# Health check endpoint
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "database": "connected" if async_db.pool else "disconnected"
    }


# Root endpoint
@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint."""
    return {
        "message": "Welcome to CastMatch AI Service",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }


# Talent search endpoint
@app.post(f"{settings.api_prefix}/talents/search", response_model=SearchResponse)
async def search_talents(criteria: TalentSearchCriteria) -> SearchResponse:
    """
    Search for talents based on criteria.
    
    Args:
        criteria: Search criteria including filters like gender, age, location, skills, etc.
        
    Returns:
        SearchResponse with matching talents and metadata
    """
    try:
        logger.info(f"Searching talents with criteria: {criteria}")
        
        # Search talents
        talents = await ai_service.search_talents(criteria)
        
        # Get total count
        total_count = len(talents)
        has_more = total_count == criteria.limit
        
        # Get AI insights if query is provided
        ai_insights = None
        if criteria.query:
            ai_insights = {
                "query_understanding": f"Searching for: {criteria.query}",
                "suggested_filters": [],
                "total_matches": total_count
            }
        
        return SearchResponse(
            talents=talents,
            total_count=total_count,
            has_more=has_more,
            search_criteria=criteria,
            ai_insights=ai_insights
        )
        
    except Exception as e:
        logger.error(f"Error searching talents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Talent recommendations endpoint
@app.post(f"{settings.api_prefix}/talents/recommend")
async def get_recommendations(
    role_description: str,
    criteria: TalentSearchCriteria = None
) -> Dict[str, Any]:
    """
    Get AI-powered talent recommendations for a specific role.
    
    Args:
        role_description: Description of the role to cast
        criteria: Optional search criteria to filter talents
        
    Returns:
        List of recommended talents with AI insights
    """
    try:
        logger.info(f"Getting recommendations for role: {role_description[:100]}...")
        
        # Get recommendations
        recommendations = await ai_service.get_talent_recommendations(
            role_description,
            criteria
        )
        
        return {
            "role_description": role_description,
            "recommendations": recommendations,
            "total_recommendations": len(recommendations)
        }
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# AI Chat endpoint
@app.post(f"{settings.api_prefix}/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest) -> ChatResponse:
    """
    Chat with AI assistant for talent search and casting advice.
    
    Args:
        request: Chat request with messages and optional search criteria
        
    Returns:
        AI response with optional talent recommendations
    """
    try:
        logger.info(f"Processing chat request with {len(request.messages)} messages")
        
        # Process chat
        response = await ai_service.process_chat(request)
        
        return response
        
    except Exception as e:
        logger.error(f"Error processing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Get talent by ID
@app.get(f"{settings.api_prefix}/talents/{{talent_id}}")
async def get_talent(talent_id: str) -> Dict[str, Any]:
    """
    Get detailed information about a specific talent.
    
    Args:
        talent_id: Unique identifier of the talent
        
    Returns:
        Detailed talent information
    """
    try:
        logger.info(f"Getting talent details for ID: {talent_id}")
        
        # Query talent from database
        query = """
            SELECT 
                t.*,
                pa.*
            FROM talents t
            LEFT JOIN physical_attributes pa ON pa."talentId" = t.id
            WHERE t.id = $1
        """
        
        result = await async_db.fetch_one(query, talent_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Talent not found")
        
        # Convert to dictionary and return
        talent_data = dict(result)
        
        return {
            "talent": talent_data,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting talent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Analyze talent compatibility
@app.post(f"{settings.api_prefix}/talents/analyze-compatibility")
async def analyze_compatibility(
    talent_id: str,
    role_description: str
) -> Dict[str, Any]:
    """
    Analyze compatibility between a talent and a specific role.
    
    Args:
        talent_id: ID of the talent to analyze
        role_description: Description of the role
        
    Returns:
        Compatibility analysis with match score and insights
    """
    try:
        logger.info(f"Analyzing compatibility for talent {talent_id}")
        
        # Get talent details
        query = """
            SELECT * FROM talents WHERE id = $1
        """
        
        talent_data = await async_db.fetch_one(query, talent_id)
        
        if not talent_data:
            raise HTTPException(status_code=404, detail="Talent not found")
        
        # Perform AI analysis
        # This would typically use the AI service for detailed analysis
        analysis = {
            "talent_id": talent_id,
            "role_description": role_description,
            "match_score": 85,  # Would be calculated by AI
            "strengths": [
                "Strong acting background",
                "Matches age requirements",
                "Available for the shooting dates"
            ],
            "considerations": [
                "May need dialect coaching",
                "Travel arrangements needed",
                "Schedule conflicts to resolve"
            ],
            "recommendation": "Highly recommended for audition",
            "ai_insights": "Based on the profile analysis, this talent shows strong potential for the role."
        }
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing compatibility: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Batch talent search
@app.post(f"{settings.api_prefix}/talents/batch-search")
async def batch_search_talents(
    criteria_list: list[TalentSearchCriteria]
) -> Dict[str, Any]:
    """
    Perform multiple talent searches in a single request.
    
    Args:
        criteria_list: List of search criteria
        
    Returns:
        Results for each search criteria
    """
    try:
        logger.info(f"Performing batch search with {len(criteria_list)} criteria")
        
        results = []
        for criteria in criteria_list:
            talents = await ai_service.search_talents(criteria)
            results.append({
                "criteria": criteria,
                "talents": talents,
                "count": len(talents)
            })
        
        return {
            "batch_results": results,
            "total_searches": len(criteria_list)
        }
        
    except Exception as e:
        logger.error(f"Error in batch search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Simple chat endpoint for backend integration
@app.post("/chat")
async def simple_chat(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simple chat endpoint for backend integration.
    
    Args:
        request: Chat request with message and context
        
    Returns:
        Chat response with AI-generated content
    """
    try:
        message = request.get("message", "")
        user_id = request.get("user_id", "anonymous")
        session_id = request.get("session_id", "default")
        
        logger.info(f"Processing simple chat from user {user_id}: {message[:100]}...")
        
        # Create a simplified ChatRequest for the AI service
        chat_request = ChatRequest(
            messages=[{"role": "user", "content": message}],
            user_id=user_id,
            session_id=session_id
        )
        
        # Process with AI service
        response = await ai_service.process_chat(chat_request)
        
        # Return simplified response format expected by backend
        return {
            "message": response.message,
            "talents": response.talents or [],
            "suggestions": response.suggestions or ["Try asking about actors or search criteria"],
            "action_type": response.action_type or "general",
            "filters_applied": getattr(response, 'filters_applied', None),
            "service": "python-ai-service",
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error in simple chat: {e}")
        # Return fallback response instead of raising exception
        return {
            "message": f"I received your message: {message}. I'm working on processing it with AI capabilities.",
            "talents": [],
            "suggestions": [
                "Try: 'Find actors in Mumbai aged 25-35'",
                "Or: 'Show me experienced dancers'",
                "Or: 'Recommend actors for a romantic comedy'"
            ],
            "action_type": "general",
            "service": "python-ai-service", 
            "status": "processing"
        }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
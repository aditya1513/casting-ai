"""API endpoints for semantic talent search."""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from loguru import logger
import uuid

from app.search.hybrid_search import HybridSearch
from app.search.conversational_search import ConversationalSearch, SearchCriteria, SearchIntent
from app.search.ranking_engine import SearchRanking
from app.search.index_manager import IndexManager
from app.search.embedding_pipeline import TalentEmbeddingPipeline
from app.core.config import settings


# Pydantic models for request/response

class SemanticSearchRequest(BaseModel):
    """Request model for semantic search."""
    query: str = Field(..., description="Natural language search query")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")
    top_k: int = Field(20, description="Number of results to return", ge=1, le=100)
    include_explanations: bool = Field(True, description="Include ranking explanations")
    user_context: Optional[Dict[str, Any]] = Field(None, description="User and project context")


class SearchSuggestionRequest(BaseModel):
    """Request for search suggestions."""
    partial_query: str = Field(..., description="Partial search query")
    limit: int = Field(5, description="Number of suggestions", ge=1, le=10)


class SimilarTalentRequest(BaseModel):
    """Request for finding similar talents."""
    talent_id: str = Field(..., description="Reference talent ID")
    top_k: int = Field(10, description="Number of similar talents", ge=1, le=50)
    exclude_self: bool = Field(True, description="Exclude reference talent from results")


class BatchSearchRequest(BaseModel):
    """Request for batch search operations."""
    queries: List[str] = Field(..., description="List of search queries")
    common_filters: Optional[Dict[str, Any]] = Field(None, description="Filters applied to all queries")
    top_k_per_query: int = Field(10, description="Results per query", ge=1, le=20)


class SaveSearchRequest(BaseModel):
    """Request to save a search."""
    search_name: str = Field(..., description="Name for the saved search")
    query: str = Field(..., description="Search query")
    filters: Optional[Dict[str, Any]] = Field(None, description="Search filters")
    alert_enabled: bool = Field(False, description="Enable alerts for new matches")


class TalentProfile(BaseModel):
    """Talent profile for indexing."""
    id: Optional[str] = Field(None, description="Talent ID")
    name: str = Field(..., description="Talent name")
    biography: Optional[str] = Field(None, description="Biography")
    skills: Optional[List[str]] = Field(None, description="Skills list")
    languages: Optional[List[str]] = Field(None, description="Languages spoken")
    age: Optional[int] = Field(None, description="Age", ge=0, le=120)
    gender: Optional[str] = Field(None, description="Gender")
    location: Optional[str] = Field(None, description="Location")
    experience_years: Optional[int] = Field(None, description="Years of experience", ge=0)
    genres: Optional[List[str]] = Field(None, description="Preferred genres")
    budget_range: Optional[Dict[str, float]] = Field(None, description="Budget range")
    availability: Optional[str] = Field(None, description="Availability status")


class SearchResult(BaseModel):
    """Search result model."""
    talent_id: str
    name: str
    match_score: float
    match_explanation: Optional[str]
    profile_summary: Optional[str]
    key_highlights: Optional[List[str]]
    availability: Optional[str]
    quick_stats: Optional[Dict[str, Any]]
    rank: Optional[int]


class SearchResponse(BaseModel):
    """Search response model."""
    query: str
    total_results: int
    facets: Optional[Dict[str, Any]]
    results: List[SearchResult]
    search_time_ms: int
    suggested_refinements: Optional[List[str]]


class SearchAnalytics(BaseModel):
    """Search analytics data."""
    total_searches: int
    average_search_time_ms: float
    popular_queries: List[Dict[str, Any]]
    conversion_rate: float
    user_satisfaction: float


# Initialize services
hybrid_search = HybridSearch()
conversational_search = ConversationalSearch()
ranking_engine = SearchRanking()
index_manager = IndexManager()
embedding_pipeline = TalentEmbeddingPipeline()

# Create router
router = APIRouter(prefix="/api/v2/search", tags=["Search"])


@router.post("/talent/semantic", response_model=SearchResponse)
async def semantic_talent_search(request: SemanticSearchRequest):
    """
    Perform semantic search for talents using natural language.
    
    This endpoint supports:
    - Natural language queries ("Find actors like Shah Rukh Khan")
    - Filters for age, location, skills, etc.
    - Personalized ranking based on user context
    - Detailed match explanations
    """
    try:
        start_time = datetime.utcnow()
        
        # Parse natural language query
        parsed_query = await conversational_search.parse_natural_query(
            request.query,
            context=request.user_context
        )
        
        # Extract criteria
        criteria = SearchCriteria(**parsed_query.get("criteria", {}))
        
        # Apply additional filters if provided
        if request.filters:
            for key, value in request.filters.items():
                if hasattr(criteria, key):
                    setattr(criteria, key, value)
        
        # Execute hybrid search
        results = await hybrid_search.hybrid_search_pipeline(
            query=request.query,
            criteria=criteria,
            top_k=request.top_k
        )
        
        # Apply ML ranking if user context provided
        if request.user_context:
            results = await ranking_engine.rank_with_ml_scoring(
                results,
                parsed_query,
                request.user_context
            )
        
        # Format response
        formatted_results = []
        for result in results[:request.top_k]:
            formatted_result = SearchResult(
                talent_id=result["id"],
                name=result.get("metadata", {}).get("name", "Unknown"),
                match_score=result.get("final_score", result.get("combined_score", 0)),
                match_explanation=result.get("ranking_explanation") if request.include_explanations else None,
                profile_summary=result.get("metadata", {}).get("biography", "")[:200],
                key_highlights=_extract_highlights(result),
                availability=result.get("availability_status", "unknown"),
                quick_stats=result.get("quick_stats"),
                rank=result.get("rank")
            )
            formatted_results.append(formatted_result)
        
        # Calculate facets
        facets = _calculate_facets(results)
        
        # Generate refinement suggestions
        suggested_refinements = await conversational_search.generate_search_suggestions(
            request.query
        )
        
        # Calculate search time
        search_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Store search analytics
        await _store_search_analytics(request.query, len(results), search_time)
        
        return SearchResponse(
            query=request.query,
            total_results=len(results),
            facets=facets,
            results=formatted_results,
            search_time_ms=search_time,
            suggested_refinements=suggested_refinements[:3]
        )
        
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/talent/suggestions")
async def get_search_suggestions(request: SearchSuggestionRequest):
    """
    Get search query suggestions based on partial input.
    
    Returns autocomplete suggestions to help users formulate queries.
    """
    try:
        suggestions = await conversational_search.generate_search_suggestions(
            request.partial_query
        )
        
        return {
            "partial_query": request.partial_query,
            "suggestions": suggestions[:request.limit]
        }
        
    except Exception as e:
        logger.error(f"Failed to generate suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/talent/similar/{talent_id}")
async def find_similar_talents(
    talent_id: str,
    request: SimilarTalentRequest
):
    """
    Find talents similar to a reference talent.
    
    Uses vector similarity to find talents with similar profiles.
    """
    try:
        # Find similar talents using vector search
        from app.search.pinecone_client import PineconeSearchSystem
        pinecone_client = PineconeSearchSystem()
        
        similar_results = await pinecone_client.similarity_search(
            talent_id=talent_id,
            top_k=request.top_k + 1 if request.exclude_self else request.top_k
        )
        
        # Filter out self if requested
        if request.exclude_self:
            similar_results = [r for r in similar_results if r["id"] != talent_id]
        
        # Format results
        formatted_results = []
        for result in similar_results[:request.top_k]:
            formatted_results.append({
                "talent_id": result["id"],
                "name": result.get("metadata", {}).get("name", "Unknown"),
                "similarity_score": result.get("score", 0),
                "metadata": result.get("metadata", {})
            })
        
        return {
            "reference_talent": talent_id,
            "similar_talents": formatted_results,
            "count": len(formatted_results)
        }
        
    except Exception as e:
        logger.error(f"Similar talent search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/talent/batch")
async def batch_talent_search(request: BatchSearchRequest):
    """
    Perform multiple searches in a single request.
    
    Efficient for bulk search operations.
    """
    try:
        batch_results = []
        
        for query in request.queries:
            # Parse query
            parsed_query = await conversational_search.parse_natural_query(query)
            criteria = SearchCriteria(**parsed_query.get("criteria", {}))
            
            # Apply common filters
            if request.common_filters:
                for key, value in request.common_filters.items():
                    if hasattr(criteria, key):
                        setattr(criteria, key, value)
            
            # Execute search
            results = await hybrid_search.hybrid_search_pipeline(
                query=query,
                criteria=criteria,
                top_k=request.top_k_per_query
            )
            
            batch_results.append({
                "query": query,
                "results": results[:request.top_k_per_query],
                "count": len(results)
            })
        
        return {
            "batch_size": len(request.queries),
            "results": batch_results
        }
        
    except Exception as e:
        logger.error(f"Batch search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved")
async def get_saved_searches(user_id: str = Query(..., description="User ID")):
    """
    Get user's saved searches.
    """
    try:
        # TODO: Implement database query for saved searches
        # For now, return mock data
        saved_searches = [
            {
                "id": str(uuid.uuid4()),
                "search_name": "Young romantic leads",
                "query": "young actors for romantic comedy",
                "created_at": datetime.utcnow().isoformat(),
                "alert_enabled": True
            }
        ]
        
        return {
            "user_id": user_id,
            "saved_searches": saved_searches,
            "count": len(saved_searches)
        }
        
    except Exception as e:
        logger.error(f"Failed to get saved searches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_search(
    request: SaveSearchRequest,
    user_id: str = Query(..., description="User ID")
):
    """
    Save a search for later use.
    """
    try:
        search_id = str(uuid.uuid4())
        
        # TODO: Save to database
        saved_search = {
            "id": search_id,
            "user_id": user_id,
            "search_name": request.search_name,
            "query": request.query,
            "filters": request.filters,
            "alert_enabled": request.alert_enabled,
            "created_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Saved search {search_id} for user {user_id}")
        
        return {
            "message": "Search saved successfully",
            "search_id": search_id,
            "saved_search": saved_search
        }
        
    except Exception as e:
        logger.error(f"Failed to save search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/saved/{search_id}")
async def delete_saved_search(
    search_id: str,
    user_id: str = Query(..., description="User ID")
):
    """
    Delete a saved search.
    """
    try:
        # TODO: Delete from database
        
        logger.info(f"Deleted search {search_id} for user {user_id}")
        
        return {
            "message": "Search deleted successfully",
            "search_id": search_id
        }
        
    except Exception as e:
        logger.error(f"Failed to delete search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics", response_model=SearchAnalytics)
async def get_search_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """
    Get search analytics and insights.
    """
    try:
        # TODO: Implement actual analytics from database
        # For now, return mock data
        analytics = SearchAnalytics(
            total_searches=1234,
            average_search_time_ms=234.5,
            popular_queries=[
                {"query": "young actors", "count": 45},
                {"query": "theater trained", "count": 38},
                {"query": "female lead", "count": 32}
            ],
            conversion_rate=0.23,
            user_satisfaction=0.87
        )
        
        return analytics
        
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/talent", status_code=201)
async def index_talent_profile(
    profile: TalentProfile,
    background_tasks: BackgroundTasks
):
    """
    Index a new talent profile for search.
    """
    try:
        # Generate ID if not provided
        if not profile.id:
            profile.id = str(uuid.uuid4())
        
        # Generate embedding
        profile_dict = profile.dict()
        embedding_result = await embedding_pipeline.generate_profile_embedding(profile_dict)
        
        # Index in Pinecone
        from app.search.pinecone_client import PineconeSearchSystem
        pinecone_client = PineconeSearchSystem()
        
        success = await pinecone_client.upsert_talent_vectors(
            embeddings=embedding_result["embedding"],
            metadata=embedding_result["metadata"],
            talent_id=profile.id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to index talent")
        
        # Schedule background tasks
        background_tasks.add_task(
            _update_index_statistics,
            profile.id
        )
        
        return {
            "message": "Talent indexed successfully",
            "talent_id": profile.id,
            "indexed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to index talent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/index/talent/{talent_id}")
async def update_talent_index(
    talent_id: str,
    profile: TalentProfile,
    background_tasks: BackgroundTasks
):
    """
    Update an existing talent's search index.
    """
    try:
        profile.id = talent_id
        profile_dict = profile.dict()
        
        # Queue update for processing
        await index_manager.queue_profile_update({
            "talent_id": talent_id,
            "profile_data": profile_dict,
            "operation": "update",
            "priority": "normal"
        })
        
        # Process in background
        background_tasks.add_task(
            index_manager.process_pending_updates,
            force=True
        )
        
        return {
            "message": "Talent index update queued",
            "talent_id": talent_id,
            "queued_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to update talent index: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/index/talent/{talent_id}")
async def delete_talent_from_index(talent_id: str):
    """
    Remove a talent from the search index.
    """
    try:
        # Queue deletion
        await index_manager.queue_profile_update({
            "talent_id": talent_id,
            "operation": "delete",
            "priority": "high"
        })
        
        # Process immediately
        await index_manager.process_pending_updates(force=True)
        
        return {
            "message": "Talent removed from index",
            "talent_id": talent_id,
            "deleted_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to delete talent from index: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/reindex")
async def trigger_reindexing(background_tasks: BackgroundTasks):
    """
    Trigger full reindexing of all talents.
    
    This is a heavy operation and should be used sparingly.
    """
    try:
        # Schedule reindexing in background
        background_tasks.add_task(
            index_manager.reindex_on_major_changes
        )
        
        return {
            "message": "Reindexing triggered",
            "status": "processing",
            "triggered_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger reindexing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/index/stats")
async def get_index_statistics():
    """
    Get search index statistics.
    """
    try:
        from app.search.pinecone_client import PineconeSearchSystem
        pinecone_client = PineconeSearchSystem()
        
        stats = await pinecone_client.get_index_stats()
        
        return {
            "index_stats": stats,
            "manager_stats": index_manager.index_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get index stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions

def _extract_highlights(result: Dict[str, Any]) -> List[str]:
    """Extract key highlights from search result."""
    highlights = []
    metadata = result.get("metadata", {})
    
    if metadata.get("awards"):
        highlights.append(f"{len(metadata['awards'])} awards")
    
    if metadata.get("experience_years"):
        highlights.append(f"{metadata['experience_years']} years experience")
    
    if metadata.get("languages"):
        highlights.append(f"Speaks {len(metadata['languages'])} languages")
    
    if metadata.get("recent_project"):
        highlights.append(f"Recent: {metadata['recent_project']}")
    
    return highlights[:4]


def _calculate_facets(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate search result facets for filtering."""
    facets = {
        "age_range": {},
        "location": {},
        "languages": {},
        "gender": {},
        "availability": {}
    }
    
    for result in results:
        metadata = result.get("metadata", {})
        
        # Age facets
        if metadata.get("age"):
            age_group = f"{(metadata['age'] // 5) * 5}-{(metadata['age'] // 5) * 5 + 4}"
            facets["age_range"][age_group] = facets["age_range"].get(age_group, 0) + 1
        
        # Location facets
        if metadata.get("location"):
            location = metadata["location"]
            facets["location"][location] = facets["location"].get(location, 0) + 1
        
        # Language facets
        if metadata.get("languages"):
            for language in metadata["languages"]:
                facets["languages"][language] = facets["languages"].get(language, 0) + 1
        
        # Gender facets
        if metadata.get("gender"):
            gender = metadata["gender"]
            facets["gender"][gender] = facets["gender"].get(gender, 0) + 1
        
        # Availability facets
        availability = result.get("availability_status", "unknown")
        facets["availability"][availability] = facets["availability"].get(availability, 0) + 1
    
    return facets


async def _store_search_analytics(query: str, result_count: int, search_time: int):
    """Store search analytics data."""
    try:
        # TODO: Implement actual storage to database
        logger.info(f"Search analytics: query='{query}', results={result_count}, time={search_time}ms")
    except Exception as e:
        logger.error(f"Failed to store analytics: {e}")


async def _update_index_statistics(talent_id: str):
    """Update index statistics after indexing."""
    try:
        # TODO: Implement actual statistics update
        logger.info(f"Updated index statistics for talent {talent_id}")
    except Exception as e:
        logger.error(f"Failed to update statistics: {e}")
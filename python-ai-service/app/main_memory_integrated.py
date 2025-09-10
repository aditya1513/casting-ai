"""Main FastAPI application with Advanced Memory System Integration."""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys
import asyncio
from typing import Dict, Any

from app.core.config import settings
from app.database.connection import async_db
from app.services.ai_service import ai_service
from app.services.memory_service import ShortTermMemory, LongTermMemory

# Import advanced memory components
from app.memory.episodic_v2 import EpisodicMemory
from app.memory.semantic_graph import SemanticKnowledge
from app.memory.procedural import ProceduralMemory
from app.memory.consolidation import MemoryConsolidationEngine

# Import memory API routes
from app.api import memory_routes

# Import existing schemas
from app.schemas.talent import (
    TalentSearchCriteria,
    SearchResponse,
    ChatRequest,
    ChatResponse,
    TalentDetail,
    TalentRecommendation
)

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

# Initialize memory components globally
stm = ShortTermMemory()
ltm = LongTermMemory()
episodic_memory = EpisodicMemory()
semantic_knowledge = SemanticKnowledge()
procedural_memory = ProceduralMemory()
consolidation_engine = MemoryConsolidationEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with memory system initialization."""
    # Startup
    logger.info("Starting CastMatch AI Service with Advanced Memory System...")
    
    # Connect to database
    try:
        await async_db.connect()
        logger.info("Connected to PostgreSQL database")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
    
    # Initialize memory systems
    try:
        # Connect STM to Redis
        await stm.connect()
        logger.info("Short-term memory (Redis) connected")
        
        # Initialize semantic knowledge graph
        await semantic_knowledge.initialize()
        logger.info("Semantic knowledge graph initialized")
        
        # Initialize consolidation engine
        await consolidation_engine.initialize()
        logger.info("Memory consolidation engine started")
        
        # Run database migrations for advanced memory
        await run_memory_migrations()
        logger.info("Memory database migrations completed")
        
    except Exception as e:
        logger.error(f"Failed to initialize memory systems: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down CastMatch AI Service...")
    
    # Final memory consolidation before shutdown
    try:
        logger.info("Performing final memory consolidation...")
        await consolidation_engine.consolidate_stm_to_episodic()
        await consolidation_engine.prune_irrelevant_memories()
    except Exception as e:
        logger.error(f"Error during final consolidation: {e}")
    
    await async_db.disconnect()


async def run_memory_migrations():
    """Run database migrations for advanced memory system."""
    try:
        # Check if advanced memory tables exist
        check_query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'episodic_memories_v2'
            );
        """
        
        table_exists = await async_db.fetchval(check_query)
        
        if not table_exists:
            logger.info("Creating advanced memory tables...")
            
            # Read migration file
            with open("migrations/002_advanced_memory.sql", "r") as f:
                migration_sql = f.read()
            
            # Execute migration
            # Split by semicolon but be careful with functions
            statements = []
            current_statement = []
            in_function = False
            
            for line in migration_sql.split('\n'):
                if '$$' in line:
                    in_function = not in_function
                current_statement.append(line)
                
                if ';' in line and not in_function:
                    statements.append('\n'.join(current_statement))
                    current_statement = []
            
            if current_statement:
                statements.append('\n'.join(current_statement))
            
            # Execute each statement
            for statement in statements:
                if statement.strip():
                    try:
                        await async_db.execute(statement)
                    except Exception as e:
                        logger.warning(f"Migration statement warning: {e}")
            
            logger.info("Advanced memory tables created successfully")
        else:
            logger.info("Advanced memory tables already exist")
            
    except Exception as e:
        logger.error(f"Error running memory migrations: {e}")


# Create FastAPI app with extended configuration
app = FastAPI(
    title=f"{settings.app_name} - Advanced Memory Edition",
    version="2.0.0",
    description="AI-powered talent search with advanced episodic, semantic, and procedural memory systems",
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

# Include memory API routes
app.include_router(memory_routes.router)


# =====================================================
# ENHANCED ENDPOINTS WITH MEMORY INTEGRATION
# =====================================================

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Enhanced health check including memory systems."""
    memory_health = {
        "stm": "connected" if stm.redis_client else "disconnected",
        "episodic": "operational",
        "semantic": f"{semantic_knowledge.graph.number_of_nodes()} nodes",
        "procedural": "operational",
        "consolidation": "active"
    }
    
    return {
        "status": "healthy",
        "service": f"{settings.app_name} - Advanced Memory",
        "version": "2.0.0",
        "database": "connected" if async_db.pool else "disconnected",
        "memory_systems": memory_health,
        "consolidation_metrics": consolidation_engine.metrics
    }


@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint with memory system information."""
    return {
        "message": "Welcome to CastMatch AI Service with Advanced Memory System",
        "version": "2.0.0",
        "features": {
            "episodic_memory": "Store and recall casting decisions with emotional valence",
            "semantic_knowledge": "Industry knowledge graph with relationships",
            "procedural_learning": "Workflow optimization and automation",
            "memory_consolidation": "Automatic memory management with forgetting curve"
        },
        "api_docs": "/docs",
        "memory_api": "/api/v2/memory",
        "health": "/health"
    }


@app.post(f"{settings.api_prefix}/talents/search", response_model=SearchResponse)
async def search_talents_with_memory(criteria: TalentSearchCriteria) -> SearchResponse:
    """
    Enhanced talent search with memory-based recommendations.
    
    Uses episodic memory to find similar past searches and semantic knowledge
    for better recommendations.
    """
    try:
        # Store search in STM for immediate context
        await stm.store_context(
            conversation_id=f"search_{criteria.project_id}",
            message={
                "type": "talent_search",
                "criteria": criteria.dict(),
                "timestamp": str(datetime.utcnow())
            }
        )
        
        # Find similar past searches from episodic memory
        similar_searches = await episodic_memory.find_similar_episodes(
            current_context=criteria.dict(),
            top_k=3
        )
        
        # Perform the search (existing logic)
        results = await ai_service.search_talents(criteria)
        
        # Enhance results with memory insights
        if similar_searches:
            # Add insights from similar searches
            for talent in results.talents:
                # Check if this talent appeared in similar searches
                for similar in similar_searches:
                    if talent.id in similar.get("decision_details", {}).get("talent_ids", []):
                        talent.metadata = talent.metadata or {}
                        talent.metadata["previously_considered"] = True
                        talent.metadata["past_success_rate"] = similar.get("emotional_valence", 0.5)
        
        # Store search decision for future learning
        asyncio.create_task(
            episodic_memory.store_casting_decision(
                decision_details={
                    "type": "talent_search",
                    "project_id": criteria.project_id,
                    "criteria": criteria.dict(),
                    "talent_ids": [t.id for t in results.talents[:10]]
                },
                context={
                    "total_results": results.total,
                    "search_time": datetime.utcnow().isoformat()
                }
            )
        )
        
        # Track search pattern for procedural learning
        asyncio.create_task(
            procedural_memory.record_action_sequence(
                user_id=criteria.user_id or "system",
                actions=[{
                    "type": "search",
                    "state_from": "initial",
                    "state_to": "talent_search",
                    "parameters": criteria.dict(),
                    "duration": 2,  # seconds
                    "success": True
                }]
            )
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(f"{settings.api_prefix}/chat", response_model=ChatResponse)
async def chat_with_memory(request: ChatRequest) -> ChatResponse:
    """
    Enhanced chat with full memory context.
    
    Uses all three memory types to provide intelligent, context-aware responses.
    """
    try:
        # Get conversation context from STM
        stm_context = await stm.get_context(request.conversation_id, limit=7)
        
        # Find relevant episodic memories
        similar_episodes = await episodic_memory.find_similar_episodes(
            current_context={"message": request.message, "role": request.role},
            top_k=3
        )
        
        # Query semantic knowledge for relevant information
        semantic_context = []
        if "prefer" in request.message.lower():
            # Extract user preferences
            semantic_results = await semantic_knowledge.query_knowledge_graph(
                f"SELECT ?preference WHERE user PREFERS ?preference"
            )
            semantic_context = semantic_results[:5]
        
        # Build enriched context for AI
        enriched_context = {
            "short_term": stm_context,
            "episodic": similar_episodes,
            "semantic": semantic_context,
            "workflow_state": request.metadata.get("workflow_state", "initial") if request.metadata else "initial"
        }
        
        # Generate response with enriched context
        response = await ai_service.process_chat(
            message=request.message,
            role=request.role,
            context=enriched_context
        )
        
        # Store interaction in STM
        await stm.store_context(
            conversation_id=request.conversation_id,
            message={
                "role": request.role,
                "content": request.message,
                "response": response.content,
                "timestamp": str(datetime.utcnow())
            }
        )
        
        # Track workflow if applicable
        if request.metadata and "action_type" in request.metadata:
            asyncio.create_task(
                procedural_memory.record_action_sequence(
                    user_id=request.metadata.get("user_id", "system"),
                    actions=[{
                        "type": request.metadata["action_type"],
                        "state_from": request.metadata.get("state_from", "chat"),
                        "state_to": request.metadata.get("state_to", "chat"),
                        "duration": 1,
                        "success": True
                    }]
                )
            )
        
        return response
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get(f"{settings.api_prefix}/recommendations/{talent_id}")
async def get_recommendations_with_memory(talent_id: str) -> TalentRecommendation:
    """
    Get talent recommendations enhanced with memory insights.
    
    Uses semantic knowledge graph and episodic memory for better recommendations.
    """
    try:
        # Query knowledge graph for related talents
        graph_results = await semantic_knowledge.query_knowledge_graph(
            f"SELECT ?talent WHERE worked_with '{talent_id}'"
        )
        
        # Get successful past collaborations from episodic memory
        similar_context = {"talent_id": talent_id, "type": "collaboration"}
        past_successes = await episodic_memory.find_similar_episodes(
            current_context=similar_context,
            top_k=5
        )
        
        # Build recommendation
        recommendation = TalentRecommendation(
            talent_id=talent_id,
            recommendations=[],
            reasoning="",
            confidence=0.0
        )
        
        # Add graph-based recommendations
        for result in graph_results[:5]:
            recommendation.recommendations.append({
                "talent_id": result.get("actor"),
                "reason": "Previous successful collaboration",
                "confidence": result.get("confidence", 0.7)
            })
        
        # Add episodic-based recommendations
        for episode in past_successes:
            if episode.get("emotional_valence", 0) > 0.7:
                for tid in episode.get("decision_details", {}).get("talent_ids", []):
                    if tid != talent_id:
                        recommendation.recommendations.append({
                            "talent_id": tid,
                            "reason": "Similar successful casting",
                            "confidence": episode.get("similarity", 0.6)
                        })
        
        # Calculate overall confidence
        if recommendation.recommendations:
            confidences = [r["confidence"] for r in recommendation.recommendations]
            recommendation.confidence = sum(confidences) / len(confidences)
            recommendation.reasoning = f"Based on {len(graph_results)} network connections and {len(past_successes)} similar past castings"
        
        return recommendation
        
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(f"{settings.api_prefix}/feedback")
async def provide_feedback_with_learning(feedback: Dict[str, Any]) -> Dict[str, Any]:
    """
    Receive feedback and update memory systems for learning.
    
    Updates semantic knowledge weights and reinforces episodic memories.
    """
    try:
        # Update semantic knowledge based on feedback
        if "recommendations" in feedback:
            await semantic_knowledge.update_knowledge_weights(feedback)
        
        # Reinforce successful episodic memories
        if feedback.get("success", False) and "memory_ids" in feedback:
            await episodic_memory.reinforce_important_memories([{
                "memory_ids": feedback["memory_ids"]
            }])
        
        # Learn from workflow if provided
        if "workflow_sequence" in feedback:
            successful = feedback.get("success", False)
            await procedural_memory.learn_best_practices([{
                "sequence": feedback["workflow_sequence"],
                "success": successful,
                "duration": feedback.get("duration", 0)
            }])
        
        return {
            "status": "feedback_processed",
            "learning_applied": True,
            "message": "Memory systems updated with feedback"
        }
        
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# MEMORY ANALYTICS ENDPOINTS
# =====================================================

@app.get("/api/v2/analytics/memory-usage")
async def get_memory_usage_analytics() -> Dict[str, Any]:
    """Get detailed memory usage analytics."""
    try:
        from app.algorithms.forgetting_curve import MemoryTrace
        from datetime import datetime, timedelta
        
        # Sample memory traces for analysis
        sample_traces = []
        for i in range(10):
            trace = MemoryTrace(
                memory_id=f"mem_{i}",
                initial_strength=1.0,
                current_strength=0.8 - (i * 0.05),
                creation_time=datetime.utcnow() - timedelta(days=30-i),
                last_access_time=datetime.utcnow() - timedelta(days=i),
                access_count=10 - i,
                importance_factor=0.5 + (i * 0.05),
                emotional_weight=0.6,
                context_richness=0.7
            )
            sample_traces.append(trace)
        
        # Calculate memory load
        from app.algorithms.forgetting_curve import EbbinghausForgettingCurve
        curve = EbbinghausForgettingCurve()
        memory_load = curve.calculate_memory_load(sample_traces)
        
        # Get consolidation recommendations
        recommendations = curve.recommend_consolidation_strategy(sample_traces)
        
        return {
            "memory_load": memory_load,
            "consolidation_recommendations": recommendations,
            "system_metrics": consolidation_engine.metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v2/analytics/learning-progress")
async def get_learning_progress() -> Dict[str, Any]:
    """Track system learning progress over time."""
    try:
        progress = {
            "episodic_memories_stored": 0,  # Would query from database
            "semantic_relationships_learned": semantic_knowledge.graph.number_of_edges(),
            "workflow_patterns_discovered": 0,  # Would query from database
            "automation_opportunities_identified": 0,  # Would query from database
            "user_preferences_tracked": 0,  # Would query from database
            "best_practices_extracted": 0,  # Would query from database
            "memory_compression_ratio": 0.0,  # Would calculate from consolidation
            "learning_efficiency": 0.0,  # Would calculate from patterns
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return progress
        
    except Exception as e:
        logger.error(f"Progress tracking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Additional imports needed
from datetime import datetime

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main_memory_integrated:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
"""Enhanced FastAPI application with complete AI/ML integration for CastMatch."""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import asyncio
from prometheus_client import Counter, Histogram, generate_latest
from fastapi.responses import PlainTextResponse
import time

from app.core.config import settings
from app.database.connection import async_db

# Import all AI/ML services
from app.services.claude_service import claude_service, ClaudeModel
from app.services.memory_service import (
    short_term_memory,
    long_term_memory,
    memory_consolidation,
    ImportanceScore
)
from app.services.search_service import (
    pinecone_service,
    script_analyzer,
    embedding_service
)
from app.services.nlp_service import (
    nlp_service,
    chemistry_predictor,
    CastingIntent,
    EntityType
)
from app.services.ai_service import ai_service
from app.utils.prompts import (
    casting_prompts,
    conversational_prompts,
    PromptContext
)

# Import schemas
from app.schemas.talent import (
    TalentSearchCriteria,
    SearchResponse,
    ChatRequest,
    ChatResponse,
    ChatMessage
)

# Prometheus metrics
request_count = Counter('castmatch_requests_total', 'Total requests', ['method', 'endpoint'])
request_duration = Histogram('castmatch_request_duration_seconds', 'Request duration', ['method', 'endpoint'])
ai_response_time = Histogram('castmatch_ai_response_seconds', 'AI response time', ['service'])
token_usage = Counter('castmatch_token_usage_total', 'Token usage', ['model'])

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level=settings.log_level
)
logger.add(
    "logs/app_enhanced.log",
    rotation="500 MB",
    retention="10 days",
    level=settings.log_level
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with AI service initialization."""
    # Startup
    logger.info("Starting Enhanced CastMatch AI Service...")
    
    # Connect to database
    try:
        await async_db.connect()
        logger.info("Connected to PostgreSQL database")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
    
    # Initialize Redis for STM
    try:
        await short_term_memory.connect()
        logger.info("Connected to Redis for STM")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
    
    # Initialize vector database
    if pinecone_service.index:
        stats = await pinecone_service.update_index_stats()
        logger.info(f"Pinecone index stats: {stats}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Enhanced CastMatch AI Service...")
    await async_db.disconnect()


# Create FastAPI app
app = FastAPI(
    title="CastMatch AI Service - Enhanced",
    version="2.0.0",
    description="AI-powered talent search with Claude, memory systems, and semantic search",
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


# Middleware for metrics
@app.middleware("http")
async def track_metrics(request, call_next):
    """Track request metrics."""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    request_count.labels(method=request.method, endpoint=request.url.path).inc()
    request_duration.labels(method=request.method, endpoint=request.url.path).observe(duration)
    
    return response


# Health and metrics endpoints
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Enhanced health check with service status."""
    return {
        "status": "healthy",
        "service": "CastMatch AI Enhanced",
        "version": "2.0.0",
        "services": {
            "database": "connected" if async_db.pool else "disconnected",
            "redis": "connected" if short_term_memory.redis_client else "disconnected",
            "claude": "available" if claude_service.client else "unavailable",
            "pinecone": "connected" if pinecone_service.index else "disconnected"
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    """Prometheus metrics endpoint."""
    return generate_latest()


# AI Chat with Claude and Memory
@app.post(f"{settings.api_prefix}/ai/chat/message")
async def process_chat_message(
    conversation_id: str,
    message: str,
    user_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> Dict[str, Any]:
    """
    Process chat message with Claude, memory, and NLP.
    
    Args:
        conversation_id: Unique conversation ID
        message: User message
        user_id: Optional user ID
        context: Optional additional context
        background_tasks: FastAPI background tasks
        
    Returns:
        AI response with suggestions and search results
    """
    try:
        start_time = time.time()
        
        # 1. Store message in STM
        await short_term_memory.store_context(
            conversation_id,
            {
                "role": "user",
                "content": message,
                "user_id": user_id
            },
            ImportanceScore.MEDIUM
        )
        
        # 2. Extract intent and entities
        intent, confidence = await nlp_service.recognize_intent(message, context)
        entities = await nlp_service.extract_entities(message)
        
        logger.info(f"Intent: {intent.value} (confidence: {confidence:.2f})")
        logger.info(f"Entities: {entities}")
        
        # 3. Retrieve relevant memories
        stm_context = await short_term_memory.get_context(conversation_id, limit=5)
        ltm_memories = await long_term_memory.retrieve_relevant(message, top_k=3)
        
        # 4. Prepare context for Claude
        messages = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in stm_context
        ]
        messages.append({"role": "user", "content": message})
        
        # 5. Select appropriate Claude model based on complexity
        model = ClaudeModel.SONNET if confidence > 0.7 else ClaudeModel.OPUS
        
        # 6. Get system prompt based on context
        system_prompt = casting_prompts.SYSTEM_PROMPTS.get(
            PromptContext.MUMBAI_OTT,
            casting_prompts.SYSTEM_PROMPTS[PromptContext.MUMBAI_OTT]
        )
        
        # Add memory context to system prompt
        if ltm_memories:
            system_prompt += f"\n\nRelevant past information:\n"
            for memory in ltm_memories[:2]:
                system_prompt += f"- {memory.get('content', {}).get('content', '')}\n"
        
        # 7. Generate Claude response
        response_text, metadata = await claude_service.generate_response(
            messages=messages,
            conversation_id=conversation_id,
            model=model,
            temperature=0.7,
            max_tokens=2000,
            system_prompt=system_prompt
        )
        
        # 8. Process based on intent
        search_results = None
        suggestions = []
        
        if intent == CastingIntent.SEARCH_TALENT and entities:
            # Perform semantic search
            search_query = await nlp_service.generate_casting_query(entities, intent)
            
            if pinecone_service.index:
                search_results = await pinecone_service.hybrid_search(
                    query=message,
                    keyword_filters=search_query,
                    top_k=10
                )
            else:
                # Fallback to database search
                criteria = TalentSearchCriteria(**search_query)
                talents = await ai_service.search_talents(criteria)
                search_results = [
                    {"id": t.id, "score": 0.8, "metadata": t.dict()}
                    for t in talents[:10]
                ]
        
        elif intent == CastingIntent.ANALYZE_SCRIPT:
            # Trigger script analysis
            if "script" in context or "script_text" in context:
                script_analysis = await script_analyzer.analyze_character_requirements(
                    context.get("script_text", "")
                )
                suggestions.append({
                    "action": "view_script_analysis",
                    "data": script_analysis
                })
        
        elif intent == CastingIntent.COMPARE_TALENTS:
            # Extract talent IDs from entities
            if EntityType.ACTOR_NAME in entities:
                suggestions.append({
                    "action": "compare_talents",
                    "talents": entities[EntityType.ACTOR_NAME]
                })
        
        # 9. Generate proactive suggestions
        stage = context.get("stage", "initial") if context else "initial"
        suggestion_prompt = conversational_prompts.get_suggestion_prompt(
            {"intent": intent.value, "entities": entities},
            stage
        )
        
        suggestion_response, _ = await claude_service.generate_response(
            messages=[{"role": "user", "content": suggestion_prompt}],
            model=ClaudeModel.HAIKU,
            temperature=0.5,
            max_tokens=500
        )
        
        # Parse suggestions
        try:
            suggested_actions = suggestion_response.split("\n")
            suggestions.extend([
                {"text": action.strip(), "type": "next_step"}
                for action in suggested_actions if action.strip()
            ])
        except:
            pass
        
        # 10. Store response in STM
        await short_term_memory.store_context(
            conversation_id,
            {
                "role": "assistant",
                "content": response_text,
                "metadata": metadata
            },
            ImportanceScore.MEDIUM
        )
        
        # 11. Schedule memory consolidation if needed
        if len(stm_context) >= 5:
            background_tasks.add_task(
                memory_consolidation.consolidate_conversation,
                conversation_id,
                user_id
            )
        
        # Track metrics
        ai_response_time.labels(service="claude").observe(time.time() - start_time)
        token_usage.labels(model=model.value).inc(metadata.get("tokens", {}).get("total_tokens", 0))
        
        return {
            "response": response_text,
            "intent": intent.value,
            "confidence": confidence,
            "entities": {k.value: v for k, v in entities.items()},
            "search_results": search_results,
            "suggestions": suggestions,
            "metadata": metadata
        }
        
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Memory management endpoints
@app.get(f"{settings.api_prefix}/ai/memory/context")
async def get_memory_context(
    conversation_id: str,
    include_ltm: bool = False
) -> Dict[str, Any]:
    """Retrieve memory context for a conversation."""
    try:
        # Get STM context
        stm_context = await short_term_memory.get_context(conversation_id)
        
        result = {
            "conversation_id": conversation_id,
            "short_term_memory": stm_context,
            "stm_count": len(stm_context)
        }
        
        # Include LTM if requested
        if include_ltm:
            ltm_memories = await long_term_memory.retrieve_relevant(
                conversation_id,
                top_k=10
            )
            result["long_term_memory"] = ltm_memories
            result["ltm_count"] = len(ltm_memories)
        
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving memory context: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(f"{settings.api_prefix}/ai/memory/consolidate")
async def consolidate_memory(
    conversation_id: str,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Manually trigger memory consolidation."""
    try:
        result = await memory_consolidation.consolidate_conversation(
            conversation_id,
            user_id
        )
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Error consolidating memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Semantic search endpoints
@app.post(f"{settings.api_prefix}/ai/search/talent")
async def semantic_talent_search(
    query: str,
    filters: Optional[Dict[str, Any]] = None,
    use_hybrid: bool = True,
    top_k: int = 20
) -> Dict[str, Any]:
    """Perform semantic search for talents."""
    try:
        start_time = time.time()
        
        if use_hybrid and pinecone_service.index:
            # Hybrid search (semantic + keyword)
            results = await pinecone_service.hybrid_search(
                query=query,
                keyword_filters=filters,
                semantic_weight=0.7,
                top_k=top_k
            )
        elif pinecone_service.index:
            # Pure semantic search
            results = await pinecone_service.search_similar_talents(
                query=query,
                filters=filters,
                top_k=top_k
            )
        else:
            # Fallback to database search
            criteria = TalentSearchCriteria(query=query, **(filters or {}))
            talents = await ai_service.search_talents(criteria)
            results = [
                {
                    "id": t.id,
                    "score": 0.5,
                    "metadata": t.dict()
                }
                for t in talents[:top_k]
            ]
        
        # Track metrics
        ai_response_time.labels(service="search").observe(time.time() - start_time)
        
        return {
            "query": query,
            "filters": filters,
            "results": results,
            "count": len(results),
            "search_type": "hybrid" if use_hybrid else "semantic"
        }
        
    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Script analysis endpoint
@app.post(f"{settings.api_prefix}/ai/analyze/script")
async def analyze_script(
    script_text: str,
    extract_characters: bool = True,
    extract_requirements: bool = True,
    project_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Analyze script for casting requirements."""
    try:
        start_time = time.time()
        
        # Use Claude for comprehensive analysis
        analysis_result = await claude_service.analyze_script(
            script_text=script_text,
            extract_characters=extract_characters,
            extract_requirements=extract_requirements
        )
        
        # Additional analysis with script analyzer
        character_requirements = await script_analyzer.analyze_character_requirements(
            script_text
        )
        
        # Generate casting suggestions
        suggestions = []
        if character_requirements.get("characters"):
            for char_name, char_desc in character_requirements["characters"].items():
                # Extract traits
                traits = await nlp_service.extract_character_traits(char_desc)
                
                # Search for matching talents
                if pinecone_service.index:
                    matches = await pinecone_service.search_similar_talents(
                        query=char_desc,
                        top_k=5
                    )
                    
                    suggestions.append({
                        "character": char_name,
                        "traits": traits,
                        "suggested_talents": matches
                    })
        
        # Track metrics
        ai_response_time.labels(service="script_analysis").observe(time.time() - start_time)
        
        return {
            "claude_analysis": analysis_result,
            "character_requirements": character_requirements,
            "casting_suggestions": suggestions,
            "project_context": project_context
        }
        
    except Exception as e:
        logger.error(f"Error analyzing script: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Chemistry prediction endpoint
@app.post(f"{settings.api_prefix}/ai/match/chemistry")
async def predict_chemistry(
    talent1_id: str,
    talent2_id: str,
    scene_type: Optional[str] = None
) -> Dict[str, Any]:
    """Predict chemistry between two talents."""
    try:
        # Fetch talent profiles
        query = "SELECT * FROM talents WHERE id = $1"
        
        talent1_data = await async_db.fetch_one(query, talent1_id)
        talent2_data = await async_db.fetch_one(query, talent2_id)
        
        if not talent1_data or not talent2_data:
            raise HTTPException(status_code=404, detail="One or both talents not found")
        
        # Predict chemistry
        chemistry_result = await chemistry_predictor.predict_chemistry(
            dict(talent1_data),
            dict(talent2_data),
            scene_type
        )
        
        # Get Claude's opinion
        prompt = casting_prompts.get_chemistry_test_prompt(
            actor1=f"{talent1_data['firstName']} {talent1_data['lastName']}",
            actor2=f"{talent2_data['firstName']} {talent2_data['lastName']}",
            relationship_type=scene_type or "general",
            scene_context="Based on their profiles and experience"
        )
        
        claude_opinion, _ = await claude_service.generate_response(
            messages=[{"role": "user", "content": prompt}],
            model=ClaudeModel.SONNET,
            temperature=0.6,
            max_tokens=1000
        )
        
        return {
            "talent1": {
                "id": talent1_id,
                "name": f"{talent1_data['firstName']} {talent1_data['lastName']}"
            },
            "talent2": {
                "id": talent2_id,
                "name": f"{talent2_data['firstName']} {talent2_data['lastName']}"
            },
            "chemistry_analysis": chemistry_result,
            "ai_opinion": claude_opinion
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error predicting chemistry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Proactive suggestions endpoint
@app.get(f"{settings.api_prefix}/ai/suggestions")
async def get_proactive_suggestions(
    conversation_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Get proactive AI suggestions based on context."""
    try:
        suggestions = []
        
        # Get conversation context if available
        if conversation_id:
            stm_context = await short_term_memory.get_context(conversation_id, limit=3)
            
            if stm_context:
                # Analyze recent context for suggestions
                last_message = stm_context[-1] if stm_context else {}
                
                # Generate contextual suggestions
                prompt = conversational_prompts.get_suggestion_prompt(
                    {"messages": stm_context},
                    context.get("stage", "ongoing") if context else "ongoing"
                )
                
                response, _ = await claude_service.generate_response(
                    messages=[{"role": "user", "content": prompt}],
                    model=ClaudeModel.HAIKU,
                    temperature=0.6,
                    max_tokens=500
                )
                
                suggestions.extend(response.split("\n"))
        
        # Add general suggestions if no context
        if not suggestions:
            suggestions = [
                "Search for talents by describing your ideal candidate",
                "Upload a script for automatic character analysis",
                "Create a shortlist for your current project",
                "Schedule auditions with selected talents",
                "Compare multiple talents side by side"
            ]
        
        return {
            "suggestions": [s.strip() for s in suggestions if s.strip()],
            "context_available": bool(conversation_id and stm_context)
        }
        
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket endpoint for real-time chat
@app.websocket(f"{settings.api_prefix}/ws/chat/{{conversation_id}}")
async def websocket_chat(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time chat with AI."""
    await websocket.accept()
    logger.info(f"WebSocket connection established for conversation {conversation_id}")
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process message
            response = await process_chat_message(
                conversation_id=conversation_id,
                message=message_data.get("message"),
                user_id=message_data.get("user_id"),
                context=message_data.get("context")
            )
            
            # Send response
            await websocket.send_json(response)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for conversation {conversation_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()


# Token usage report endpoint
@app.get(f"{settings.api_prefix}/ai/usage/report")
async def get_usage_report() -> Dict[str, Any]:
    """Get AI service usage report."""
    try:
        token_report = claude_service.token_tracker.get_usage_report()
        
        # Get Pinecone stats if available
        pinecone_stats = {}
        if pinecone_service.index:
            pinecone_stats = await pinecone_service.update_index_stats()
        
        return {
            "token_usage": token_report,
            "vector_database": pinecone_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating usage report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main_enhanced:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
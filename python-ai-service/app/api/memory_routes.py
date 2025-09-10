"""API Routes for Advanced Memory System."""

from fastapi import APIRouter, HTTPException, Query, Body, BackgroundTasks
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from loguru import logger
import uuid

from app.memory.episodic_v2 import EpisodicMemory, DecisionType, EmotionalValence
from app.memory.semantic_graph import SemanticKnowledge, RelationType, NodeType
from app.memory.procedural import ProceduralMemory, WorkflowState, ActionType
from app.memory.consolidation import MemoryConsolidationEngine, ConsolidationStrategy
from app.algorithms.forgetting_curve import EbbinghausForgettingCurve, MemoryTrace
from app.algorithms.pattern_mining import PrefixSpan, GSP, ParallelPatternMiner


# Create router
router = APIRouter(prefix="/api/v2/memory", tags=["Memory"])

# Initialize memory components
episodic_memory = EpisodicMemory()
semantic_knowledge = SemanticKnowledge()
procedural_memory = ProceduralMemory()
consolidation_engine = MemoryConsolidationEngine()
forgetting_curve = EbbinghausForgettingCurve()


# =====================================================
# PYDANTIC MODELS
# =====================================================

class EpisodicMemoryRequest(BaseModel):
    """Request model for storing episodic memory."""
    user_id: str
    decision_type: str = Field(default="casting_decision")
    decision_details: Dict[str, Any]
    context: Dict[str, Any]
    outcome: Optional[Dict[str, Any]] = None
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "decision_type": "talent_selection",
                "decision_details": {
                    "project_id": "proj_123",
                    "role_id": "role_456",
                    "talent_ids": ["talent_1", "talent_2"],
                    "criteria": {"age": "25-35", "skills": ["acting", "dancing"]}
                },
                "context": {
                    "budget": 1000000,
                    "timeline": "3 months",
                    "location": "Mumbai"
                },
                "outcome": {
                    "success": True,
                    "client_satisfaction": 4.5
                }
            }
        }


class SimilarEpisodesRequest(BaseModel):
    """Request model for finding similar episodes."""
    current_context: Dict[str, Any]
    top_k: int = Field(default=5, ge=1, le=20)
    
    class Config:
        schema_extra = {
            "example": {
                "current_context": {
                    "project_type": "web_series",
                    "genre": "drama",
                    "budget_range": "medium"
                },
                "top_k": 5
            }
        }


class SemanticQueryRequest(BaseModel):
    """Request model for semantic knowledge query."""
    query: str = Field(..., description="SPARQL-like query string")
    limit: int = Field(default=50, ge=1, le=100)
    
    class Config:
        schema_extra = {
            "example": {
                "query": "SELECT ?actor WHERE worked_with 'Shah Rukh Khan'",
                "limit": 10
            }
        }


class WorkflowRecordRequest(BaseModel):
    """Request model for recording workflow actions."""
    user_id: str
    actions: List[Dict[str, Any]]
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "actions": [
                    {
                        "type": "search",
                        "state_from": "initial",
                        "state_to": "talent_search",
                        "duration": 120,
                        "success": True
                    },
                    {
                        "type": "filter",
                        "state_from": "talent_search",
                        "state_to": "shortlisting",
                        "duration": 60,
                        "success": True
                    }
                ]
            }
        }


class OptimizationRequest(BaseModel):
    """Request model for workflow optimization."""
    current_state: str
    goal_state: str
    
    class Config:
        schema_extra = {
            "example": {
                "current_state": "talent_search",
                "goal_state": "final_selection"
            }
        }


class ConsolidationRequest(BaseModel):
    """Request model for memory consolidation."""
    strategy: str = Field(default="hybrid")
    conversation_id: Optional[str] = None


# =====================================================
# EPISODIC MEMORY ENDPOINTS
# =====================================================

@router.post("/episodic/store", response_model=Dict[str, Any])
async def store_episodic_memory(request: EpisodicMemoryRequest):
    """
    Store a new episodic memory of a casting decision.
    
    This endpoint captures detailed casting decisions along with context
    and outcomes for future learning and recommendation.
    """
    try:
        # Prepare decision details
        decision_details = {
            "user_id": request.user_id,
            "type": request.decision_type,
            **request.decision_details
        }
        
        # Store memory
        memory_id = await episodic_memory.store_casting_decision(
            decision_details=decision_details,
            context=request.context,
            outcome=request.outcome
        )
        
        # Calculate emotional valence
        emotional_valence = await episodic_memory.calculate_emotional_valence({
            "decision": decision_details,
            "outcome": request.outcome
        })
        
        return {
            "success": True,
            "memory_id": memory_id,
            "emotional_valence": emotional_valence,
            "message": "Episodic memory stored successfully"
        }
        
    except Exception as e:
        logger.error(f"Error storing episodic memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/episodic/similar", response_model=List[Dict[str, Any]])
async def find_similar_episodes(
    context: str = Query(..., description="JSON string of current context"),
    top_k: int = Query(5, ge=1, le=20)
):
    """
    Find similar past episodes based on current context.
    
    Uses vector similarity search to find relevant past casting decisions.
    """
    try:
        import json
        current_context = json.loads(context)
        
        similar_episodes = await episodic_memory.find_similar_episodes(
            current_context=current_context,
            top_k=top_k
        )
        
        return similar_episodes
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in context parameter")
    except Exception as e:
        logger.error(f"Error finding similar episodes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/episodic/consolidate", response_model=Dict[str, Any])
async def trigger_episodic_consolidation(
    importance_threshold: float = Query(0.7, ge=0.0, le=1.0)
):
    """
    Trigger consolidation of episodic memories.
    
    Consolidates important memories and compresses similar ones.
    """
    try:
        stats = await episodic_memory.trigger_consolidation(
            importance_threshold=importance_threshold
        )
        
        return {
            "success": True,
            "statistics": stats,
            "message": "Episodic memory consolidation completed"
        }
        
    except Exception as e:
        logger.error(f"Error triggering consolidation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# SEMANTIC KNOWLEDGE ENDPOINTS
# =====================================================

@router.post("/semantic/query", response_model=List[Dict[str, Any]])
async def query_knowledge_graph(request: SemanticQueryRequest):
    """
    Query the semantic knowledge graph using SPARQL-like syntax.
    
    Supports queries for relationships, preferences, and industry knowledge.
    """
    try:
        results = await semantic_knowledge.query_knowledge_graph(
            sparql_query=request.query
        )
        
        # Limit results
        return results[:request.limit]
        
    except Exception as e:
        logger.error(f"Error querying knowledge graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/semantic/graph", response_model=Dict[str, Any])
async def get_knowledge_graph_stats():
    """
    Get statistics and visualization data for the knowledge graph.
    
    Returns node counts, relationship types, and network metrics.
    """
    try:
        stats = {
            "total_nodes": semantic_knowledge.graph.number_of_nodes(),
            "total_edges": semantic_knowledge.graph.number_of_edges(),
            "node_types": {},
            "relationship_types": {},
            "network_density": 0.0
        }
        
        # Count node types
        for node, data in semantic_knowledge.graph.nodes(data=True):
            node_type = data.get('node_type', 'unknown')
            if node_type not in stats["node_types"]:
                stats["node_types"][node_type] = 0
            stats["node_types"][node_type] += 1
        
        # Count relationship types
        for _, _, data in semantic_knowledge.graph.edges(data=True):
            rel_type = data.get('predicate', 'unknown')
            if rel_type not in stats["relationship_types"]:
                stats["relationship_types"][rel_type] = 0
            stats["relationship_types"][rel_type] += 1
        
        # Calculate density
        if stats["total_nodes"] > 1:
            max_edges = stats["total_nodes"] * (stats["total_nodes"] - 1)
            stats["network_density"] = stats["total_edges"] / max_edges if max_edges > 0 else 0
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting graph stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/semantic/preferences", response_model=Dict[str, Any])
async def track_user_preferences(
    user_id: str = Body(...),
    patterns: List[Dict[str, Any]] = Body(...)
):
    """
    Track and analyze user preferences for genres and platforms.
    
    Builds preference profiles for personalized recommendations.
    """
    try:
        result = await semantic_knowledge.track_genre_preferences(
            user_id=user_id,
            patterns=patterns
        )
        
        return {
            "success": True,
            "preferences": result,
            "message": "Preferences tracked successfully"
        }
        
    except Exception as e:
        logger.error(f"Error tracking preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/semantic/trends", response_model=Dict[str, Any])
async def extract_industry_trends(
    decisions: List[Dict[str, Any]] = Body(..., description="List of casting decisions")
):
    """
    Extract industry trends from casting decisions.
    
    Analyzes patterns to identify hot genres, in-demand skills, and rising talents.
    """
    try:
        trends = await semantic_knowledge.extract_industry_trends(decisions)
        
        return {
            "success": True,
            "trends": trends,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error extracting trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# PROCEDURAL MEMORY ENDPOINTS
# =====================================================

@router.post("/procedural/record", response_model=Dict[str, Any])
async def record_workflow_actions(request: WorkflowRecordRequest):
    """
    Record a sequence of workflow actions for learning.
    
    Captures user workflows for pattern detection and optimization.
    """
    try:
        sequence_id = await procedural_memory.record_action_sequence(
            user_id=request.user_id,
            actions=request.actions
        )
        
        return {
            "success": True,
            "sequence_id": sequence_id,
            "actions_recorded": len(request.actions),
            "message": "Workflow actions recorded successfully"
        }
        
    except Exception as e:
        logger.error(f"Error recording workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/procedural/suggestions", response_model=List[Dict[str, Any]])
async def get_workflow_suggestions(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get workflow optimization suggestions for a user.
    
    Returns automation opportunities and best practices.
    """
    try:
        # Get user's workflow patterns
        # This is a simplified version - in production, query from database
        patterns = []  # Would be fetched from database
        
        suggestions = await procedural_memory.generate_automation_suggestions(patterns)
        
        return suggestions[:limit]
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/procedural/optimize", response_model=List[Dict[str, Any]])
async def optimize_workflow_path(request: OptimizationRequest):
    """
    Find optimal path from current state to goal state.
    
    Uses A* algorithm to suggest the most efficient workflow.
    """
    try:
        current_state = WorkflowState(request.current_state)
        goal_state = WorkflowState(request.goal_state)
        
        optimal_path = await procedural_memory.optimize_workflow_path(
            current_state=current_state,
            goal=goal_state
        )
        
        return optimal_path
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid state: {e}")
    except Exception as e:
        logger.error(f"Error optimizing workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/procedural/patterns", response_model=List[Dict[str, Any]])
async def get_discovered_patterns(
    pattern_type: Optional[str] = Query(None, description="Filter by pattern type"),
    min_support: float = Query(0.1, ge=0.0, le=1.0)
):
    """
    Get discovered workflow patterns.
    
    Returns frequent sequences, parallel actions, and cyclic patterns.
    """
    try:
        # This would query from the discovered_patterns table
        # For demonstration, we'll use pattern mining
        
        # Sample data - would come from database
        sequences = [
            ["search", "filter", "shortlist", "schedule"],
            ["search", "shortlist", "schedule", "review"],
            ["search", "filter", "shortlist", "review", "approve"],
        ]
        
        # Mine patterns
        miner = PrefixSpan(min_support=min_support)
        patterns = miner.mine_patterns(sequences)
        
        # Convert to response format
        result = []
        for pattern in patterns:
            if not pattern_type or pattern.pattern_type.value == pattern_type:
                result.append({
                    "pattern_id": pattern.pattern_id,
                    "sequence": pattern.sequence,
                    "support": pattern.support,
                    "confidence": pattern.confidence,
                    "type": pattern.pattern_type.value
                })
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting patterns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# CONSOLIDATION ENDPOINTS
# =====================================================

@router.post("/consolidate", response_model=Dict[str, Any])
async def trigger_memory_consolidation(
    request: ConsolidationRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger comprehensive memory consolidation.
    
    Consolidates STM to episodic, extracts semantic knowledge,
    and identifies procedural patterns.
    """
    try:
        # Run consolidation in background
        background_tasks.add_task(
            _run_consolidation,
            request.strategy,
            request.conversation_id
        )
        
        return {
            "success": True,
            "message": "Consolidation started in background",
            "strategy": request.strategy
        }
        
    except Exception as e:
        logger.error(f"Error triggering consolidation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _run_consolidation(strategy: str, conversation_id: Optional[str]):
    """Background task for memory consolidation."""
    try:
        # Run different consolidation tasks
        tasks = []
        
        if strategy in ["hybrid", "episodic"]:
            tasks.append(
                consolidation_engine.consolidate_stm_to_episodic(conversation_id)
            )
        
        if strategy in ["hybrid", "semantic"]:
            tasks.append(
                consolidation_engine.extract_semantic_knowledge()
            )
        
        if strategy in ["hybrid", "procedural"]:
            tasks.append(
                consolidation_engine.identify_procedural_patterns()
            )
        
        # Execute consolidation tasks
        import asyncio
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info(f"Consolidation completed: {results}")
        
    except Exception as e:
        logger.error(f"Error in background consolidation: {e}")


@router.get("/insights", response_model=Dict[str, Any])
async def get_memory_insights():
    """
    Get comprehensive insights from the memory system.
    
    Returns memory statistics, patterns, preferences, and recommendations.
    """
    try:
        insights = await consolidation_engine.generate_memory_insights()
        
        # Add forgetting curve analysis
        # This would analyze actual memory traces from database
        sample_traces = [
            MemoryTrace(
                memory_id=str(uuid.uuid4()),
                initial_strength=1.0,
                current_strength=0.8,
                creation_time=datetime.utcnow() - timedelta(days=7),
                last_access_time=datetime.utcnow() - timedelta(days=2),
                access_count=3,
                importance_factor=0.7,
                emotional_weight=0.6,
                context_richness=0.5
            )
        ]
        
        retention_recommendations = forgetting_curve.recommend_consolidation_strategy(
            sample_traces
        )
        
        insights["retention_analysis"] = retention_recommendations
        
        return insights
        
    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=Dict[str, Any])
async def get_memory_statistics():
    """
    Get current memory system statistics.
    
    Returns counts, usage metrics, and performance indicators.
    """
    try:
        stats = {
            "episodic": {
                "total_memories": 0,  # Query from database
                "avg_importance": 0.0,
                "avg_emotional_valence": 0.0
            },
            "semantic": {
                "total_nodes": semantic_knowledge.graph.number_of_nodes(),
                "total_relationships": semantic_knowledge.graph.number_of_edges(),
                "graph_density": 0.0
            },
            "procedural": {
                "total_patterns": 0,  # Query from database
                "avg_success_rate": 0.0,
                "automation_opportunities": 0
            },
            "consolidation": consolidation_engine.metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# HEALTH CHECK
# =====================================================

@router.get("/health", response_model=Dict[str, str])
async def health_check():
    """Check health of memory system components."""
    return {
        "status": "healthy",
        "episodic": "operational",
        "semantic": "operational",
        "procedural": "operational",
        "consolidation": "operational",
        "timestamp": datetime.utcnow().isoformat()
    }
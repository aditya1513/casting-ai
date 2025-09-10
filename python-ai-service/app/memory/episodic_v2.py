"""Enhanced Episodic Memory System with emotional valence and forgetting curve."""

import uuid
import json
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncpg
from loguru import logger

from app.database.connection import async_db
from app.core.config import settings


class EmotionalValence(Enum):
    """Emotional importance levels for memories."""
    HIGHLY_POSITIVE = 1.0
    POSITIVE = 0.75
    NEUTRAL = 0.5
    NEGATIVE = 0.25
    HIGHLY_NEGATIVE = 0.0


class DecisionType(Enum):
    """Types of casting decisions."""
    TALENT_SELECTION = "talent_selection"
    AUDITION_SCHEDULING = "audition_scheduling"
    ROLE_MATCHING = "role_matching"
    BUDGET_ALLOCATION = "budget_allocation"
    CREATIVE_DIRECTION = "creative_direction"


@dataclass
class CastingDecision:
    """Structured casting decision data."""
    decision_id: str
    user_id: str
    project_id: str
    decision_type: DecisionType
    talent_ids: List[str]
    role_requirements: Dict[str, Any]
    decision_rationale: str
    outcome: Optional[Dict[str, Any]]
    confidence_score: float
    metadata: Dict[str, Any]
    timestamp: datetime


class EpisodicMemory:
    """Enhanced episodic memory with emotional valence and forgetting curve."""
    
    def __init__(self):
        self.db = async_db
        self.ebbinghaus_k = 0.5  # Forgetting curve steepness
        self.consolidation_threshold = 0.7  # Minimum importance for consolidation
        self.similarity_threshold = 0.85  # Threshold for similar episodes
        
    async def store_casting_decision(
        self,
        decision_details: Dict[str, Any],
        context: Dict[str, Any],
        outcome: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Store a casting decision with full context and metadata.
        
        Args:
            decision_details: Details of the casting decision
            context: Contextual information (project, timeline, constraints)
            outcome: Decision outcome (if available)
            
        Returns:
            Memory ID
        """
        try:
            memory_id = str(uuid.uuid4())
            
            # Calculate emotional valence based on outcome
            emotional_valence = await self.calculate_emotional_valence({
                "decision": decision_details,
                "outcome": outcome
            })
            
            # Calculate initial importance score
            importance_score = self._calculate_importance(
                decision_details,
                emotional_valence
            )
            
            # Generate embedding for similarity search
            embedding = await self._generate_embedding(decision_details, context)
            
            # Store in database
            query = """
                INSERT INTO episodic_memories_v2 (
                    id, user_id, event_type, decision_details,
                    emotional_valence, importance_score, reinforcement_count,
                    last_accessed, decay_factor, context_embedding, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """
            
            await self.db.execute(
                query,
                memory_id,
                decision_details.get("user_id"),
                decision_details.get("type", "casting_decision"),
                json.dumps(decision_details),
                emotional_valence,
                importance_score,
                0,  # Initial reinforcement count
                datetime.utcnow(),
                1.0,  # Initial decay factor
                embedding,
                datetime.utcnow()
            )
            
            logger.info(f"Stored episodic memory: {memory_id}")
            return memory_id
            
        except Exception as e:
            logger.error(f"Error storing casting decision: {e}")
            raise
    
    async def calculate_emotional_valence(self, memory: Dict[str, Any]) -> float:
        """
        Calculate emotional valence of a memory based on outcome and feedback.
        
        Args:
            memory: Memory data including decision and outcome
            
        Returns:
            Emotional valence score (0-1)
        """
        try:
            outcome = memory.get("outcome", {})
            
            # Base valence on neutral
            valence = EmotionalValence.NEUTRAL.value
            
            if outcome:
                # Positive indicators
                if outcome.get("success", False):
                    valence += 0.25
                if outcome.get("client_satisfaction", 0) > 4:
                    valence += 0.15
                if outcome.get("talent_performance", 0) > 4:
                    valence += 0.1
                    
                # Negative indicators
                if outcome.get("budget_overrun", False):
                    valence -= 0.2
                if outcome.get("deadline_missed", False):
                    valence -= 0.15
                if outcome.get("talent_issues", False):
                    valence -= 0.15
            
            # Clamp between 0 and 1
            return max(0.0, min(1.0, valence))
            
        except Exception as e:
            logger.error(f"Error calculating emotional valence: {e}")
            return EmotionalValence.NEUTRAL.value
    
    def apply_forgetting_curve(
        self,
        memory: Dict[str, Any],
        time_elapsed: timedelta
    ) -> float:
        """
        Apply Ebbinghaus forgetting curve to calculate memory strength.
        
        Args:
            memory: Memory data including reinforcement count
            time_elapsed: Time since last access
            
        Returns:
            Memory retention strength (0-1)
        """
        try:
            # Get reinforcement count (spaced repetition factor)
            reinforcement = memory.get("reinforcement_count", 0)
            
            # Calculate days elapsed
            days = time_elapsed.total_seconds() / 86400
            
            # Modified Ebbinghaus formula with reinforcement
            # R = e^(-k*t/S) where S is stability from reinforcement
            stability = 1 + (reinforcement * 0.5)  # Each reinforcement increases stability
            retention = np.exp(-self.ebbinghaus_k * days / stability)
            
            # Apply importance factor
            importance = memory.get("importance_score", 0.5)
            retention *= (0.5 + 0.5 * importance)  # Importance affects retention
            
            return max(0.0, min(1.0, retention))
            
        except Exception as e:
            logger.error(f"Error applying forgetting curve: {e}")
            return 0.5
    
    async def reinforce_important_memories(
        self,
        pattern_matches: List[Dict[str, Any]]
    ) -> int:
        """
        Reinforce memories that match successful patterns.
        
        Args:
            pattern_matches: List of memory patterns to reinforce
            
        Returns:
            Number of memories reinforced
        """
        try:
            reinforced_count = 0
            
            for pattern in pattern_matches:
                memory_ids = pattern.get("memory_ids", [])
                
                if memory_ids:
                    # Update reinforcement count and last accessed time
                    query = """
                        UPDATE episodic_memories_v2
                        SET reinforcement_count = reinforcement_count + 1,
                            last_accessed = $1,
                            decay_factor = LEAST(decay_factor * 1.1, 2.0)
                        WHERE id = ANY($2)
                    """
                    
                    result = await self.db.execute(
                        query,
                        datetime.utcnow(),
                        memory_ids
                    )
                    
                    # Extract number of rows updated
                    if result:
                        count = int(result.split()[-1])
                        reinforced_count += count
            
            logger.info(f"Reinforced {reinforced_count} important memories")
            return reinforced_count
            
        except Exception as e:
            logger.error(f"Error reinforcing memories: {e}")
            return 0
    
    async def find_similar_episodes(
        self,
        current_context: Dict[str, Any],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find similar past episodes using cosine similarity.
        
        Args:
            current_context: Current casting context
            top_k: Number of similar episodes to return
            
        Returns:
            List of similar episodes with similarity scores
        """
        try:
            # Generate embedding for current context
            current_embedding = await self._generate_embedding(
                current_context,
                {}
            )
            
            # Query for similar episodes using pgvector
            query = """
                SELECT 
                    id,
                    decision_details,
                    emotional_valence,
                    importance_score,
                    reinforcement_count,
                    1 - (context_embedding <=> $1) as similarity
                FROM episodic_memories_v2
                WHERE 1 - (context_embedding <=> $1) > $2
                ORDER BY similarity DESC
                LIMIT $3
            """
            
            rows = await self.db.fetch(
                query,
                current_embedding,
                self.similarity_threshold,
                top_k
            )
            
            similar_episodes = []
            for row in rows:
                # Apply forgetting curve to adjust relevance
                time_elapsed = datetime.utcnow() - row['created_at']
                retention = self.apply_forgetting_curve(dict(row), time_elapsed)
                
                similar_episodes.append({
                    "id": str(row['id']),
                    "decision_details": json.loads(row['decision_details']),
                    "emotional_valence": float(row['emotional_valence']),
                    "importance_score": float(row['importance_score']),
                    "similarity": float(row['similarity']),
                    "adjusted_relevance": float(row['similarity'] * retention),
                    "reinforcement_count": int(row['reinforcement_count'])
                })
            
            # Sort by adjusted relevance
            similar_episodes.sort(
                key=lambda x: x['adjusted_relevance'],
                reverse=True
            )
            
            logger.debug(f"Found {len(similar_episodes)} similar episodes")
            return similar_episodes
            
        except Exception as e:
            logger.error(f"Error finding similar episodes: {e}")
            return []
    
    async def trigger_consolidation(
        self,
        importance_threshold: float = 0.7
    ) -> Dict[str, Any]:
        """
        Trigger memory consolidation for important memories.
        
        Args:
            importance_threshold: Minimum importance for consolidation
            
        Returns:
            Consolidation statistics
        """
        try:
            # Find memories eligible for consolidation
            query = """
                SELECT id, decision_details, importance_score, reinforcement_count
                FROM episodic_memories_v2
                WHERE importance_score >= $1
                  AND last_accessed < $2
                  AND reinforcement_count > 0
                ORDER BY importance_score DESC, reinforcement_count DESC
                LIMIT 100
            """
            
            cutoff_date = datetime.utcnow() - timedelta(hours=1)
            rows = await self.db.fetch(query, importance_threshold, cutoff_date)
            
            consolidated = 0
            compressed = 0
            
            for row in rows:
                memory_id = row['id']
                
                # Check for similar memories to compress
                similar = await self._find_duplicates(row['decision_details'])
                
                if len(similar) > 1:
                    # Compress similar memories
                    await self._compress_memories(similar)
                    compressed += len(similar) - 1
                
                # Mark as consolidated
                await self.db.execute(
                    "UPDATE episodic_memories_v2 SET decay_factor = 2.0 WHERE id = $1",
                    memory_id
                )
                consolidated += 1
            
            stats = {
                "consolidated_count": consolidated,
                "compressed_count": compressed,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Consolidation complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error triggering consolidation: {e}")
            return {"error": str(e)}
    
    async def _generate_embedding(
        self,
        decision: Dict[str, Any],
        context: Dict[str, Any]
    ) -> List[float]:
        """Generate embedding vector for a decision and context."""
        try:
            # Combine decision and context into text
            text_content = json.dumps({
                "decision": decision,
                "context": context
            })
            
            # For now, use a simple hash-based embedding
            # In production, use Sentence-BERT or OpenAI embeddings
            import hashlib
            
            # Create 1536-dimensional embedding (matching OpenAI's size)
            hash_obj = hashlib.sha256(text_content.encode())
            hash_bytes = hash_obj.digest()
            
            # Extend to 1536 dimensions
            embedding = []
            for i in range(1536):
                byte_idx = i % len(hash_bytes)
                value = float(hash_bytes[byte_idx]) / 255.0
                embedding.append(value)
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * 1536
    
    def _calculate_importance(
        self,
        decision: Dict[str, Any],
        emotional_valence: float
    ) -> float:
        """Calculate importance score for a memory."""
        try:
            importance = 0.5  # Base importance
            
            # Factor in decision type
            decision_type = decision.get("type", "")
            if decision_type == "talent_selection":
                importance += 0.2
            elif decision_type == "budget_allocation":
                importance += 0.15
            
            # Factor in emotional valence
            importance += (emotional_valence - 0.5) * 0.3
            
            # Factor in project scale
            if decision.get("budget", 0) > 1000000:
                importance += 0.1
            
            # Factor in talent count
            if len(decision.get("talent_ids", [])) > 10:
                importance += 0.1
            
            return max(0.0, min(1.0, importance))
            
        except Exception as e:
            logger.error(f"Error calculating importance: {e}")
            return 0.5
    
    async def _find_duplicates(
        self,
        decision_details: str
    ) -> List[Dict[str, Any]]:
        """Find duplicate or highly similar memories."""
        try:
            # Parse decision details
            details = json.loads(decision_details)
            
            # Look for memories with similar content
            query = """
                SELECT id, decision_details, importance_score
                FROM episodic_memories_v2
                WHERE decision_details::jsonb @> $1::jsonb
                   OR decision_details::jsonb <@ $1::jsonb
                LIMIT 10
            """
            
            # Create a subset of key fields for comparison
            key_fields = {
                "type": details.get("type"),
                "project_id": details.get("project_id"),
                "role_id": details.get("role_id")
            }
            
            rows = await self.db.fetch(query, json.dumps(key_fields))
            
            duplicates = []
            for row in rows:
                duplicates.append({
                    "id": str(row['id']),
                    "details": json.loads(row['decision_details']),
                    "importance": float(row['importance_score'])
                })
            
            return duplicates
            
        except Exception as e:
            logger.error(f"Error finding duplicates: {e}")
            return []
    
    async def _compress_memories(self, similar_memories: List[Dict[str, Any]]) -> bool:
        """Compress similar memories into a single representative memory."""
        try:
            if len(similar_memories) < 2:
                return False
            
            # Sort by importance
            similar_memories.sort(key=lambda x: x['importance'], reverse=True)
            
            # Keep the most important one, merge metadata from others
            primary = similar_memories[0]
            secondary_ids = [m['id'] for m in similar_memories[1:]]
            
            # Update primary memory with merged information
            merged_metadata = {
                "compressed_count": len(similar_memories),
                "merged_from": secondary_ids,
                "compression_date": datetime.utcnow().isoformat()
            }
            
            query = """
                UPDATE episodic_memories_v2
                SET decision_details = jsonb_set(
                    decision_details::jsonb,
                    '{compression_metadata}',
                    $1::jsonb
                )
                WHERE id = $2
            """
            
            await self.db.execute(
                query,
                json.dumps(merged_metadata),
                uuid.UUID(primary['id'])
            )
            
            # Delete secondary memories
            delete_query = "DELETE FROM episodic_memories_v2 WHERE id = ANY($1)"
            await self.db.execute(
                delete_query,
                [uuid.UUID(id) for id in secondary_ids]
            )
            
            logger.debug(f"Compressed {len(similar_memories)} memories into one")
            return True
            
        except Exception as e:
            logger.error(f"Error compressing memories: {e}")
            return False
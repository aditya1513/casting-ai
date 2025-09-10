"""Multi-layer memory system for CastMatch AI."""

import redis.asyncio as redis
import asyncpg
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from loguru import logger
import hashlib
import numpy as np
from collections import deque
from enum import Enum

from app.core.config import settings
from app.database.connection import async_db


class MemoryType(Enum):
    """Types of memory storage."""
    EPISODIC = "episodic"  # Events and interactions
    SEMANTIC = "semantic"  # Facts and knowledge
    PROCEDURAL = "procedural"  # Workflows and patterns


class ImportanceScore(Enum):
    """Importance levels for memory consolidation."""
    CRITICAL = 10
    HIGH = 8
    MEDIUM = 5
    LOW = 2
    TRIVIAL = 1


class ShortTermMemory:
    """Redis-based short-term memory with 7±2 item capacity."""
    
    def __init__(self):
        self.redis_client = None
        self.max_items = settings.redis_max_stm_items
        self.ttl_seconds = settings.redis_stm_ttl
        
    async def connect(self):
        """Connect to Redis."""
        try:
            self.redis_client = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Connected to Redis for STM")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    async def store_context(
        self,
        conversation_id: str,
        message: Dict[str, Any],
        importance: ImportanceScore = ImportanceScore.MEDIUM
    ) -> bool:
        """
        Store a message in short-term memory.
        
        Args:
            conversation_id: Unique conversation identifier
            message: Message data to store
            importance: Importance score for prioritization
            
        Returns:
            Success status
        """
        try:
            if not self.redis_client:
                await self.connect()
            
            if not self.redis_client:
                return False
            
            # Create STM key
            stm_key = f"stm:{conversation_id}"
            
            # Add timestamp and importance
            message["timestamp"] = datetime.utcnow().isoformat()
            message["importance"] = importance.value
            
            # Get current memory items
            current_items = await self.redis_client.lrange(stm_key, 0, -1)
            
            # Apply cognitive capacity limit (7±2 items)
            if len(current_items) >= self.max_items:
                # Remove least important item or oldest if same importance
                items_with_importance = []
                for item_str in current_items:
                    item = json.loads(item_str)
                    items_with_importance.append((item, item.get("importance", 1)))
                
                # Sort by importance (ascending) and timestamp
                items_with_importance.sort(
                    key=lambda x: (x[1], x[0].get("timestamp", ""))
                )
                
                # Remove least important item
                await self.redis_client.lrem(stm_key, 1, json.dumps(items_with_importance[0][0]))
            
            # Add new message
            await self.redis_client.rpush(stm_key, json.dumps(message))
            
            # Set TTL
            await self.redis_client.expire(stm_key, self.ttl_seconds)
            
            logger.debug(f"Stored message in STM for conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing in STM: {e}")
            return False
    
    async def get_context(
        self,
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve conversation context from STM.
        
        Args:
            conversation_id: Conversation identifier
            limit: Maximum number of items to retrieve
            
        Returns:
            List of messages from STM
        """
        try:
            if not self.redis_client:
                await self.connect()
            
            if not self.redis_client:
                return []
            
            stm_key = f"stm:{conversation_id}"
            
            # Get all items or limited number
            if limit:
                items = await self.redis_client.lrange(stm_key, -limit, -1)
            else:
                items = await self.redis_client.lrange(stm_key, 0, -1)
            
            # Parse JSON items
            messages = []
            for item_str in items:
                try:
                    messages.append(json.loads(item_str))
                except json.JSONDecodeError:
                    continue
            
            return messages
            
        except Exception as e:
            logger.error(f"Error retrieving from STM: {e}")
            return []
    
    async def consolidate_to_ltm(
        self,
        conversation_id: str,
        threshold_importance: ImportanceScore = ImportanceScore.MEDIUM
    ) -> List[Dict[str, Any]]:
        """
        Consolidate important memories from STM to LTM.
        
        Args:
            conversation_id: Conversation identifier
            threshold_importance: Minimum importance for consolidation
            
        Returns:
            List of consolidated memories
        """
        try:
            messages = await self.get_context(conversation_id)
            
            # Filter by importance threshold
            important_memories = [
                msg for msg in messages
                if msg.get("importance", 1) >= threshold_importance.value
            ]
            
            # Clear STM after consolidation
            if important_memories:
                stm_key = f"stm:{conversation_id}"
                await self.redis_client.delete(stm_key)
                logger.info(f"Consolidated {len(important_memories)} memories from STM")
            
            return important_memories
            
        except Exception as e:
            logger.error(f"Error consolidating STM: {e}")
            return []
    
    async def prune_old_memories(self) -> int:
        """
        Prune expired memories from STM.
        
        Returns:
            Number of pruned conversations
        """
        try:
            if not self.redis_client:
                await self.connect()
            
            if not self.redis_client:
                return 0
            
            # Redis handles TTL automatically, but we can check for orphaned keys
            pattern = "stm:*"
            cursor = 0
            pruned = 0
            
            while True:
                cursor, keys = await self.redis_client.scan(
                    cursor=cursor,
                    match=pattern,
                    count=100
                )
                
                for key in keys:
                    ttl = await self.redis_client.ttl(key)
                    if ttl == -1:  # No TTL set
                        await self.redis_client.expire(key, self.ttl_seconds)
                        pruned += 1
                
                if cursor == 0:
                    break
            
            if pruned > 0:
                logger.info(f"Set TTL for {pruned} orphaned STM keys")
            
            return pruned
            
        except Exception as e:
            logger.error(f"Error pruning STM: {e}")
            return 0


class LongTermMemory:
    """PostgreSQL-based long-term memory with episodic, semantic, and procedural storage."""
    
    def __init__(self):
        self.db = async_db
        self.forgetting_curve_factor = 0.9  # Retention factor for memory decay
        
    async def store_episodic(
        self,
        event: Dict[str, Any],
        importance_score: ImportanceScore,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Store an episodic memory (event/interaction).
        
        Args:
            event: Event data to store
            importance_score: Importance of the event
            conversation_id: Associated conversation
            user_id: Associated user
            
        Returns:
            Success status
        """
        try:
            query = """
                INSERT INTO long_term_memories (
                    memory_type, content, importance_score, 
                    conversation_id, user_id, created_at, 
                    last_accessed, access_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $6, 0)
                RETURNING id
            """
            
            memory_id = await self.db.fetch_one(
                query,
                MemoryType.EPISODIC.value,
                json.dumps(event),
                importance_score.value,
                conversation_id,
                user_id,
                datetime.utcnow()
            )
            
            logger.debug(f"Stored episodic memory with ID: {memory_id['id']}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing episodic memory: {e}")
            return False
    
    async def store_semantic(
        self,
        fact: Dict[str, Any],
        relationships: List[str],
        category: Optional[str] = None
    ) -> bool:
        """
        Store semantic memory (facts and knowledge).
        
        Args:
            fact: Fact data to store
            relationships: Related concepts or entities
            category: Category of the fact
            
        Returns:
            Success status
        """
        try:
            # Create fact embedding for similarity search
            fact_text = json.dumps(fact)
            fact_hash = hashlib.md5(fact_text.encode()).hexdigest()
            
            # Check if fact already exists
            existing = await self.db.fetch_one(
                "SELECT id FROM semantic_facts WHERE fact_hash = $1",
                fact_hash
            )
            
            if existing:
                # Update relationships
                await self.db.execute(
                    """
                    UPDATE semantic_facts 
                    SET relationships = array_cat(relationships, $1::text[]),
                        last_accessed = $2,
                        access_count = access_count + 1
                    WHERE id = $3
                    """,
                    relationships,
                    datetime.utcnow(),
                    existing['id']
                )
            else:
                # Insert new fact
                await self.db.execute(
                    """
                    INSERT INTO semantic_facts (
                        fact_hash, content, relationships, 
                        category, created_at, last_accessed
                    ) VALUES ($1, $2, $3, $4, $5, $5)
                    """,
                    fact_hash,
                    fact_text,
                    relationships,
                    category,
                    datetime.utcnow()
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Error storing semantic memory: {e}")
            return False
    
    async def store_procedural(
        self,
        action_sequence: List[Dict[str, Any]],
        workflow_name: str,
        success_rate: float = 1.0
    ) -> bool:
        """
        Store procedural memory (workflows and patterns).
        
        Args:
            action_sequence: Sequence of actions in the workflow
            workflow_name: Name of the workflow
            success_rate: Success rate of this workflow
            
        Returns:
            Success status
        """
        try:
            query = """
                INSERT INTO procedural_memories (
                    workflow_name, action_sequence, success_rate,
                    usage_count, created_at, last_used
                ) VALUES ($1, $2, $3, 1, $4, $4)
                ON CONFLICT (workflow_name) DO UPDATE
                SET action_sequence = $2,
                    success_rate = (procedural_memories.success_rate * procedural_memories.usage_count + $3) / (procedural_memories.usage_count + 1),
                    usage_count = procedural_memories.usage_count + 1,
                    last_used = $4
            """
            
            await self.db.execute(
                query,
                workflow_name,
                json.dumps(action_sequence),
                success_rate,
                datetime.utcnow()
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error storing procedural memory: {e}")
            return False
    
    async def retrieve_relevant(
        self,
        query: str,
        memory_types: Optional[List[MemoryType]] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant memories based on query.
        
        Args:
            query: Search query
            memory_types: Types of memory to search
            top_k: Number of results to return
            
        Returns:
            List of relevant memories
        """
        try:
            if not memory_types:
                memory_types = list(MemoryType)
            
            memories = []
            
            # Search episodic memories
            if MemoryType.EPISODIC in memory_types:
                episodic_query = """
                    SELECT id, content, importance_score, created_at
                    FROM long_term_memories
                    WHERE memory_type = $1
                    AND content::text ILIKE $2
                    ORDER BY importance_score DESC, created_at DESC
                    LIMIT $3
                """
                
                rows = await self.db.fetch_all(
                    episodic_query,
                    MemoryType.EPISODIC.value,
                    f"%{query}%",
                    top_k
                )
                
                for row in rows:
                    memories.append({
                        "type": MemoryType.EPISODIC.value,
                        "content": json.loads(row['content']),
                        "importance": row['importance_score'],
                        "created_at": row['created_at'].isoformat()
                    })
            
            # Search semantic facts
            if MemoryType.SEMANTIC in memory_types:
                semantic_query = """
                    SELECT content, relationships, category
                    FROM semantic_facts
                    WHERE content::text ILIKE $1
                    OR $2 = ANY(relationships)
                    ORDER BY access_count DESC
                    LIMIT $3
                """
                
                rows = await self.db.fetch_all(
                    semantic_query,
                    f"%{query}%",
                    query,
                    top_k
                )
                
                for row in rows:
                    memories.append({
                        "type": MemoryType.SEMANTIC.value,
                        "content": json.loads(row['content']),
                        "relationships": row['relationships'],
                        "category": row['category']
                    })
            
            # Search procedural workflows
            if MemoryType.PROCEDURAL in memory_types:
                procedural_query = """
                    SELECT workflow_name, action_sequence, success_rate
                    FROM procedural_memories
                    WHERE workflow_name ILIKE $1
                    ORDER BY success_rate DESC, usage_count DESC
                    LIMIT $2
                """
                
                rows = await self.db.fetch_all(
                    procedural_query,
                    f"%{query}%",
                    top_k
                )
                
                for row in rows:
                    memories.append({
                        "type": MemoryType.PROCEDURAL.value,
                        "workflow": row['workflow_name'],
                        "actions": json.loads(row['action_sequence']),
                        "success_rate": float(row['success_rate'])
                    })
            
            # Apply forgetting curve - update access patterns
            await self._update_access_patterns(memories)
            
            return memories[:top_k]
            
        except Exception as e:
            logger.error(f"Error retrieving memories: {e}")
            return []
    
    async def apply_forgetting_curve(self) -> int:
        """
        Apply forgetting curve to reduce importance of old, unused memories.
        
        Returns:
            Number of memories affected
        """
        try:
            # Reduce importance of memories not accessed recently
            query = """
                UPDATE long_term_memories
                SET importance_score = GREATEST(1, importance_score * $1)
                WHERE last_accessed < $2
                AND importance_score > 1
                RETURNING id
            """
            
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            result = await self.db.fetch_all(
                query,
                self.forgetting_curve_factor,
                cutoff_date
            )
            
            affected = len(result)
            
            if affected > 0:
                logger.info(f"Applied forgetting curve to {affected} memories")
            
            return affected
            
        except Exception as e:
            logger.error(f"Error applying forgetting curve: {e}")
            return 0
    
    async def _update_access_patterns(self, memories: List[Dict]) -> None:
        """Update access patterns for retrieved memories."""
        try:
            # Update access count and last accessed time
            for memory in memories:
                if memory["type"] == MemoryType.EPISODIC.value:
                    await self.db.execute(
                        """
                        UPDATE long_term_memories
                        SET last_accessed = $1, access_count = access_count + 1
                        WHERE content = $2
                        """,
                        datetime.utcnow(),
                        json.dumps(memory["content"])
                    )
                    
        except Exception as e:
            logger.error(f"Error updating access patterns: {e}")


class MemoryConsolidation:
    """Service for consolidating and organizing memories."""
    
    def __init__(self, stm: ShortTermMemory, ltm: LongTermMemory):
        self.stm = stm
        self.ltm = ltm
    
    async def consolidate_conversation(
        self,
        conversation_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Consolidate a conversation from STM to LTM.
        
        Args:
            conversation_id: Conversation to consolidate
            user_id: Associated user
            
        Returns:
            Consolidation summary
        """
        try:
            # Get memories from STM
            stm_memories = await self.stm.consolidate_to_ltm(
                conversation_id,
                ImportanceScore.MEDIUM
            )
            
            if not stm_memories:
                return {
                    "status": "no_memories",
                    "consolidated": 0
                }
            
            # Analyze and categorize memories
            episodic_count = 0
            semantic_count = 0
            
            for memory in stm_memories:
                importance = ImportanceScore(memory.get("importance", 5))
                
                # Store as episodic memory
                await self.ltm.store_episodic(
                    memory,
                    importance,
                    conversation_id,
                    user_id
                )
                episodic_count += 1
                
                # Extract facts for semantic storage
                facts = self._extract_facts(memory)
                for fact in facts:
                    await self.ltm.store_semantic(
                        fact,
                        self._extract_relationships(fact),
                        category="casting_knowledge"
                    )
                    semantic_count += 1
            
            return {
                "status": "success",
                "consolidated": len(stm_memories),
                "episodic_memories": episodic_count,
                "semantic_facts": semantic_count
            }
            
        except Exception as e:
            logger.error(f"Error consolidating conversation: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def _extract_facts(self, memory: Dict) -> List[Dict]:
        """Extract facts from a memory for semantic storage."""
        facts = []
        
        # Extract talent-related facts
        if "talent" in str(memory).lower():
            if "name" in memory:
                facts.append({
                    "type": "talent",
                    "name": memory.get("name"),
                    "attributes": memory.get("attributes", {})
                })
        
        # Extract requirement facts
        if "requirement" in str(memory).lower():
            facts.append({
                "type": "requirement",
                "details": memory
            })
        
        return facts
    
    def _extract_relationships(self, fact: Dict) -> List[str]:
        """Extract relationships from a fact."""
        relationships = []
        
        # Add type as relationship
        if "type" in fact:
            relationships.append(fact["type"])
        
        # Add other entities mentioned
        for key in ["name", "skill", "language", "location"]:
            if key in fact:
                relationships.append(str(fact[key]))
        
        return relationships


# Create global memory service instances
short_term_memory = ShortTermMemory()
long_term_memory = LongTermMemory()
memory_consolidation = MemoryConsolidation(short_term_memory, long_term_memory)
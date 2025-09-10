"""Memory Consolidation Engine for CastMatch."""

import asyncio
import uuid
import json
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from loguru import logger
import heapq
from collections import defaultdict

from app.database.connection import async_db
from app.core.config import settings
from app.services.memory_service import ShortTermMemory, LongTermMemory, MemoryType, ImportanceScore
from app.memory.episodic_v2 import EpisodicMemory
from app.memory.semantic_graph import SemanticKnowledge
from app.memory.procedural import ProceduralMemory


class ConsolidationStrategy(Enum):
    """Strategies for memory consolidation."""
    IMPORTANCE_BASED = "importance_based"
    FREQUENCY_BASED = "frequency_based"
    RECENCY_BASED = "recency_based"
    HYBRID = "hybrid"


class CompressionMethod(Enum):
    """Methods for memory compression."""
    SUMMARIZATION = "summarization"
    CLUSTERING = "clustering"
    PATTERN_EXTRACTION = "pattern_extraction"
    DEDUPLICATION = "deduplication"


@dataclass
class ConsolidationTask:
    """Individual consolidation task."""
    task_id: str
    memory_type: MemoryType
    strategy: ConsolidationStrategy
    source_count: int
    target_count: int
    compression_ratio: float
    status: str
    started_at: datetime
    completed_at: Optional[datetime]


class MemoryConsolidationEngine:
    """Engine for consolidating memories from STM to specialized memory systems."""
    
    def __init__(self):
        self.db = async_db
        self.stm = ShortTermMemory()
        self.ltm = LongTermMemory()
        self.episodic = EpisodicMemory()
        self.semantic = SemanticKnowledge()
        self.procedural = ProceduralMemory()
        
        # Consolidation parameters
        self.consolidation_interval = 1800  # 30 minutes in seconds
        self.importance_threshold = 0.6
        self.compression_threshold = 100  # Compress if more than 100 similar memories
        self.batch_size = 50  # Process in batches
        
        # Consolidation metrics
        self.metrics = {
            "total_consolidations": 0,
            "memories_processed": 0,
            "memories_compressed": 0,
            "patterns_extracted": 0,
            "knowledge_nodes_created": 0
        }
    
    async def initialize(self):
        """Initialize consolidation engine."""
        try:
            await self.stm.connect()
            await self.semantic.initialize()
            
            # Start periodic consolidation
            asyncio.create_task(self._periodic_consolidation())
            
            logger.info("Memory consolidation engine initialized")
            
        except Exception as e:
            logger.error(f"Error initializing consolidation engine: {e}")
    
    async def consolidate_stm_to_episodic(
        self,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Consolidate short-term memories to episodic memory.
        
        Args:
            conversation_id: Optional specific conversation to consolidate
            
        Returns:
            Consolidation statistics
        """
        try:
            stats = {
                "conversations_processed": 0,
                "memories_consolidated": 0,
                "memories_discarded": 0,
                "compression_achieved": 0.0
            }
            
            # Get conversations to process
            if conversation_id:
                conversations = [conversation_id]
            else:
                conversations = await self._get_active_conversations()
            
            for conv_id in conversations:
                # Get STM contents
                stm_memories = await self.stm.get_context(conv_id)
                
                if not stm_memories:
                    continue
                
                # Evaluate importance and consolidate
                for memory in stm_memories:
                    importance = self._evaluate_importance(memory)
                    
                    if importance >= self.importance_threshold:
                        # Convert to episodic memory
                        await self._create_episodic_memory(memory, conv_id)
                        stats["memories_consolidated"] += 1
                    else:
                        stats["memories_discarded"] += 1
                
                # Clear consolidated memories from STM
                await self.stm.consolidate_to_ltm(
                    conv_id,
                    ImportanceScore.MEDIUM
                )
                
                stats["conversations_processed"] += 1
            
            # Calculate compression ratio
            if stats["memories_consolidated"] + stats["memories_discarded"] > 0:
                stats["compression_achieved"] = (
                    stats["memories_discarded"] /
                    (stats["memories_consolidated"] + stats["memories_discarded"])
                )
            
            logger.info(f"STM to episodic consolidation complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error consolidating STM to episodic: {e}")
            return {"error": str(e)}
    
    async def extract_semantic_knowledge(self) -> Dict[str, Any]:
        """
        Extract semantic knowledge from episodic memories.
        
        Returns:
            Extraction statistics
        """
        try:
            stats = {
                "memories_analyzed": 0,
                "concepts_extracted": 0,
                "relationships_found": 0,
                "knowledge_nodes_created": 0
            }
            
            # Query recent episodic memories
            query = """
                SELECT id, decision_details, emotional_valence, importance_score
                FROM episodic_memories_v2
                WHERE created_at > $1
                  AND importance_score > $2
                ORDER BY importance_score DESC
                LIMIT 100
            """
            
            cutoff_date = datetime.utcnow() - timedelta(hours=24)
            rows = await self.db.fetch(query, cutoff_date, 0.7)
            
            relationships = []
            concepts = {}
            
            for row in rows:
                decision_details = json.loads(row['decision_details'])
                stats["memories_analyzed"] += 1
                
                # Extract entities and relationships
                entities = self._extract_entities(decision_details)
                for entity in entities:
                    if entity['type'] not in concepts:
                        concepts[entity['type']] = []
                    concepts[entity['type']].append(entity['value'])
                    stats["concepts_extracted"] += 1
                
                # Extract relationships
                rels = self._extract_relationships(decision_details)
                relationships.extend(rels)
                stats["relationships_found"] += len(rels)
            
            # Build knowledge graph
            if relationships:
                graph_stats = await self.semantic.build_actor_network(relationships)
                stats["knowledge_nodes_created"] = graph_stats.get("nodes_added", 0)
            
            # Create concept map
            if concepts:
                await self.semantic.create_concept_map(concepts)
            
            logger.info(f"Semantic knowledge extraction complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error extracting semantic knowledge: {e}")
            return {"error": str(e)}
    
    async def identify_procedural_patterns(self) -> Dict[str, Any]:
        """
        Identify procedural patterns from action sequences.
        
        Returns:
            Pattern identification statistics
        """
        try:
            stats = {
                "sequences_analyzed": 0,
                "patterns_found": 0,
                "workflows_optimized": 0,
                "automation_opportunities": 0
            }
            
            # Get recent action sequences
            query = """
                SELECT user_id, action_sequence, success_rate
                FROM procedural_patterns
                WHERE created_at > $1
                ORDER BY created_at DESC
                LIMIT 200
            """
            
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            rows = await self.db.fetch(query, cutoff_date)
            
            # Group sequences by user
            user_sequences = defaultdict(list)
            for row in rows:
                user_id = str(row['user_id'])
                sequence = json.loads(row['action_sequence'])
                user_sequences[user_id].append(sequence)
                stats["sequences_analyzed"] += 1
            
            # Detect patterns for each user
            for user_id, sequences in user_sequences.items():
                if len(sequences) >= 3:  # Need multiple sequences for patterns
                    patterns = await self.procedural.detect_workflow_patterns(sequences)
                    stats["patterns_found"] += len(patterns)
                    
                    # Generate automation suggestions
                    if patterns:
                        suggestions = await self.procedural.generate_automation_suggestions(patterns)
                        stats["automation_opportunities"] += len(suggestions)
                        
                        # Store suggestions for user
                        await self._store_automation_suggestions(user_id, suggestions)
            
            # Learn best practices
            successful_outcomes = await self._get_successful_outcomes()
            if successful_outcomes:
                best_practices = await self.procedural.learn_best_practices(successful_outcomes)
                stats["workflows_optimized"] = len(best_practices.get("optimal_sequences", []))
            
            logger.info(f"Procedural pattern identification complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error identifying procedural patterns: {e}")
            return {"error": str(e)}
    
    async def prune_irrelevant_memories(self) -> Dict[str, Any]:
        """
        Prune memories that are no longer relevant.
        
        Returns:
            Pruning statistics
        """
        try:
            stats = {
                "memories_evaluated": 0,
                "memories_pruned": 0,
                "space_freed_mb": 0.0,
                "oldest_memory_days": 0
            }
            
            # Apply forgetting curve to episodic memories
            query = """
                SELECT id, importance_score, reinforcement_count,
                       last_accessed, created_at
                FROM episodic_memories_v2
                WHERE last_accessed < $1
                ORDER BY importance_score ASC
                LIMIT 500
            """
            
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            rows = await self.db.fetch(query, cutoff_date)
            
            memories_to_prune = []
            
            for row in rows:
                stats["memories_evaluated"] += 1
                
                # Calculate retention score
                time_elapsed = datetime.utcnow() - row['last_accessed']
                retention_score = self.episodic.apply_forgetting_curve(
                    dict(row),
                    time_elapsed
                )
                
                # Prune if below threshold
                if retention_score < 0.1:  # Very low retention
                    memories_to_prune.append(row['id'])
                    
                    # Track oldest memory
                    age_days = (datetime.utcnow() - row['created_at']).days
                    stats["oldest_memory_days"] = max(stats["oldest_memory_days"], age_days)
            
            # Delete pruned memories
            if memories_to_prune:
                delete_query = """
                    DELETE FROM episodic_memories_v2
                    WHERE id = ANY($1)
                """
                
                await self.db.execute(delete_query, memories_to_prune)
                stats["memories_pruned"] = len(memories_to_prune)
                
                # Estimate space freed (rough estimate)
                stats["space_freed_mb"] = len(memories_to_prune) * 0.01  # ~10KB per memory
            
            # Prune STM
            stm_pruned = await self.stm.prune_old_memories()
            logger.info(f"Pruned {stm_pruned} STM conversations")
            
            logger.info(f"Memory pruning complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error pruning memories: {e}")
            return {"error": str(e)}
    
    async def compress_similar_memories(self) -> Dict[str, Any]:
        """
        Compress similar memories to reduce storage.
        
        Returns:
            Compression statistics
        """
        try:
            stats = {
                "memories_analyzed": 0,
                "clusters_found": 0,
                "memories_compressed": 0,
                "compression_ratio": 0.0
            }
            
            # Find similar memories using embeddings
            query = """
                SELECT id, decision_details, context_embedding
                FROM episodic_memories_v2
                WHERE created_at > $1
                LIMIT 1000
            """
            
            cutoff_date = datetime.utcnow() - timedelta(days=90)
            rows = await self.db.fetch(query, cutoff_date)
            
            if not rows:
                return stats
            
            stats["memories_analyzed"] = len(rows)
            
            # Cluster similar memories
            clusters = self._cluster_memories(rows)
            stats["clusters_found"] = len(clusters)
            
            # Compress each cluster
            for cluster in clusters:
                if len(cluster) > 3:  # Only compress if cluster is large enough
                    compressed = await self._compress_cluster(cluster)
                    if compressed:
                        stats["memories_compressed"] += len(cluster) - 1
            
            # Calculate compression ratio
            if stats["memories_analyzed"] > 0:
                stats["compression_ratio"] = (
                    stats["memories_compressed"] / stats["memories_analyzed"]
                )
            
            logger.info(f"Memory compression complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error compressing memories: {e}")
            return {"error": str(e)}
    
    async def generate_memory_insights(self) -> Dict[str, Any]:
        """
        Generate insights from consolidated memories.
        
        Returns:
            Memory insights and patterns
        """
        try:
            insights = {
                "memory_distribution": {},
                "top_patterns": [],
                "user_preferences": [],
                "optimization_opportunities": [],
                "trending_topics": [],
                "memory_health": {}
            }
            
            # Analyze memory distribution
            distribution_query = """
                SELECT 
                    event_type,
                    COUNT(*) as count,
                    AVG(importance_score) as avg_importance,
                    AVG(emotional_valence) as avg_valence
                FROM episodic_memories_v2
                GROUP BY event_type
            """
            
            dist_rows = await self.db.fetch(distribution_query)
            
            for row in dist_rows:
                insights["memory_distribution"][row['event_type']] = {
                    "count": int(row['count']),
                    "avg_importance": float(row['avg_importance']),
                    "avg_emotional_valence": float(row['avg_valence'])
                }
            
            # Get top workflow patterns
            pattern_query = """
                SELECT workflow_name, success_rate, execution_count
                FROM procedural_patterns
                WHERE execution_count > 5
                ORDER BY success_rate * execution_count DESC
                LIMIT 5
            """
            
            pattern_rows = await self.db.fetch(pattern_query)
            
            for row in pattern_rows:
                insights["top_patterns"].append({
                    "workflow": row['workflow_name'],
                    "success_rate": float(row['success_rate']),
                    "usage_count": int(row['execution_count'])
                })
            
            # Extract user preferences from knowledge graph
            preferences = await self._extract_user_preferences()
            insights["user_preferences"] = preferences
            
            # Find optimization opportunities
            optimizations = await self._find_optimization_opportunities()
            insights["optimization_opportunities"] = optimizations
            
            # Identify trending topics
            trends = await self._identify_trending_topics()
            insights["trending_topics"] = trends
            
            # Calculate memory health metrics
            health = await self._calculate_memory_health()
            insights["memory_health"] = health
            
            logger.info("Generated memory insights")
            return insights
            
        except Exception as e:
            logger.error(f"Error generating memory insights: {e}")
            return {"error": str(e)}
    
    async def _periodic_consolidation(self):
        """Run periodic consolidation tasks."""
        while True:
            try:
                await asyncio.sleep(self.consolidation_interval)
                
                logger.info("Starting periodic memory consolidation")
                
                # Run consolidation tasks
                tasks = [
                    self.consolidate_stm_to_episodic(),
                    self.extract_semantic_knowledge(),
                    self.identify_procedural_patterns(),
                    self.prune_irrelevant_memories(),
                    self.compress_similar_memories()
                ]
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Update metrics
                self.metrics["total_consolidations"] += 1
                
                for result in results:
                    if isinstance(result, dict) and "error" not in result:
                        if "memories_consolidated" in result:
                            self.metrics["memories_processed"] += result["memories_consolidated"]
                        if "memories_compressed" in result:
                            self.metrics["memories_compressed"] += result["memories_compressed"]
                        if "patterns_found" in result:
                            self.metrics["patterns_extracted"] += result["patterns_found"]
                        if "knowledge_nodes_created" in result:
                            self.metrics["knowledge_nodes_created"] += result["knowledge_nodes_created"]
                
                logger.info(f"Periodic consolidation complete. Metrics: {self.metrics}")
                
            except Exception as e:
                logger.error(f"Error in periodic consolidation: {e}")
                await asyncio.sleep(60)  # Wait before retry
    
    async def _get_active_conversations(self) -> List[str]:
        """Get list of active conversations."""
        try:
            # Get conversation IDs from Redis
            pattern = "stm:*"
            conversations = []
            
            if self.stm.redis_client:
                cursor = 0
                while True:
                    cursor, keys = await self.stm.redis_client.scan(
                        cursor=cursor,
                        match=pattern,
                        count=100
                    )
                    
                    for key in keys:
                        # Extract conversation ID from key
                        conv_id = key.replace("stm:", "")
                        conversations.append(conv_id)
                    
                    if cursor == 0:
                        break
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error getting active conversations: {e}")
            return []
    
    def _evaluate_importance(self, memory: Dict[str, Any]) -> float:
        """Evaluate importance of a memory."""
        importance = memory.get("importance", ImportanceScore.MEDIUM.value)
        
        # Normalize to 0-1 scale
        if isinstance(importance, (int, float)):
            return min(1.0, importance / 10)
        
        return 0.5  # Default medium importance
    
    async def _create_episodic_memory(
        self,
        memory: Dict[str, Any],
        conversation_id: str
    ):
        """Create episodic memory from STM memory."""
        try:
            decision_details = {
                "user_id": memory.get("user_id"),
                "type": memory.get("type", "conversation"),
                "content": memory.get("content"),
                "conversation_id": conversation_id
            }
            
            context = {
                "timestamp": memory.get("timestamp"),
                "importance": memory.get("importance")
            }
            
            await self.episodic.store_casting_decision(
                decision_details,
                context,
                None  # No outcome yet
            )
            
        except Exception as e:
            logger.error(f"Error creating episodic memory: {e}")
    
    def _extract_entities(self, decision_details: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract entities from decision details."""
        entities = []
        
        # Extract talent entities
        for talent_id in decision_details.get("talent_ids", []):
            entities.append({
                "type": "talent",
                "value": talent_id
            })
        
        # Extract role entities
        if "role_id" in decision_details:
            entities.append({
                "type": "role",
                "value": decision_details["role_id"]
            })
        
        # Extract project entities
        if "project_id" in decision_details:
            entities.append({
                "type": "project",
                "value": decision_details["project_id"]
            })
        
        # Extract skill entities
        for skill in decision_details.get("required_skills", []):
            entities.append({
                "type": "skill",
                "value": skill
            })
        
        return entities
    
    def _extract_relationships(self, decision_details: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract relationships from decision details."""
        relationships = []
        
        # Extract talent-role relationships
        talent_ids = decision_details.get("talent_ids", [])
        role_id = decision_details.get("role_id")
        
        if talent_ids and role_id:
            for talent_id in talent_ids:
                relationships.append({
                    "actor1_id": talent_id,
                    "actor2_id": role_id,
                    "type": "auditioned_for",
                    "confidence": 0.9,
                    "metadata": {}
                })
        
        # Extract talent-talent relationships
        if len(talent_ids) > 1:
            for i, talent1 in enumerate(talent_ids):
                for talent2 in talent_ids[i+1:]:
                    relationships.append({
                        "actor1_id": talent1,
                        "actor2_id": talent2,
                        "type": "co_auditioned",
                        "confidence": 0.7,
                        "metadata": {"role": role_id}
                    })
        
        return relationships
    
    async def _store_automation_suggestions(
        self,
        user_id: str,
        suggestions: List[Dict[str, Any]]
    ):
        """Store automation suggestions for user."""
        try:
            for suggestion in suggestions:
                query = """
                    UPDATE procedural_patterns
                    SET optimization_suggestions = $1
                    WHERE user_id = $2 AND workflow_name = $3
                """
                
                await self.db.execute(
                    query,
                    json.dumps([suggestion]),
                    uuid.UUID(user_id),
                    suggestion.get("workflow_name")
                )
            
        except Exception as e:
            logger.error(f"Error storing automation suggestions: {e}")
    
    async def _get_successful_outcomes(self) -> List[Dict[str, Any]]:
        """Get successful workflow outcomes."""
        try:
            query = """
                SELECT action_sequence, success_rate, average_time_seconds
                FROM procedural_patterns
                WHERE success_rate > 0.8
                  AND execution_count > 3
                LIMIT 100
            """
            
            rows = await self.db.fetch(query)
            
            outcomes = []
            for row in rows:
                outcomes.append({
                    "sequence": json.loads(row['action_sequence']),
                    "success": row['success_rate'] > 0.8,
                    "duration": row['average_time_seconds']
                })
            
            return outcomes
            
        except Exception as e:
            logger.error(f"Error getting successful outcomes: {e}")
            return []
    
    def _cluster_memories(self, memories: List[Any]) -> List[List[Any]]:
        """Cluster similar memories using embeddings."""
        try:
            if len(memories) < 2:
                return []
            
            # Simple clustering based on cosine similarity
            clusters = []
            used = set()
            
            for i, memory1 in enumerate(memories):
                if i in used:
                    continue
                
                cluster = [memory1]
                used.add(i)
                
                # Find similar memories
                for j, memory2 in enumerate(memories[i+1:], i+1):
                    if j not in used:
                        similarity = self._calculate_similarity(
                            memory1['context_embedding'],
                            memory2['context_embedding']
                        )
                        
                        if similarity > 0.85:  # High similarity threshold
                            cluster.append(memory2)
                            used.add(j)
                
                if len(cluster) > 1:
                    clusters.append(cluster)
            
            return clusters
            
        except Exception as e:
            logger.error(f"Error clustering memories: {e}")
            return []
    
    def _calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between embeddings."""
        try:
            # Convert to numpy arrays
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    async def _compress_cluster(self, cluster: List[Any]) -> bool:
        """Compress a cluster of similar memories."""
        try:
            if len(cluster) < 2:
                return False
            
            # Keep the most important memory
            cluster.sort(
                key=lambda m: json.loads(m['decision_details']).get('importance_score', 0),
                reverse=True
            )
            
            primary = cluster[0]
            secondary = cluster[1:]
            
            # Merge information into primary
            merged_details = json.loads(primary['decision_details'])
            merged_details['compression_metadata'] = {
                "compressed_count": len(secondary),
                "compressed_ids": [str(m['id']) for m in secondary],
                "compression_date": datetime.utcnow().isoformat()
            }
            
            # Update primary memory
            update_query = """
                UPDATE episodic_memories_v2
                SET decision_details = $1,
                    importance_score = GREATEST(importance_score, $2)
                WHERE id = $3
            """
            
            max_importance = max(
                json.loads(m['decision_details']).get('importance_score', 0)
                for m in cluster
            )
            
            await self.db.execute(
                update_query,
                json.dumps(merged_details),
                max_importance,
                primary['id']
            )
            
            # Delete secondary memories
            delete_query = """
                DELETE FROM episodic_memories_v2
                WHERE id = ANY($1)
            """
            
            await self.db.execute(
                delete_query,
                [m['id'] for m in secondary]
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error compressing cluster: {e}")
            return False
    
    async def _extract_user_preferences(self) -> List[Dict[str, Any]]:
        """Extract user preferences from knowledge graph."""
        try:
            # Query for user preferences
            results = await self.semantic.query_knowledge_graph(
                "SELECT ?preference WHERE user PREFERS ?preference"
            )
            
            preferences = []
            for result in results[:10]:
                preferences.append({
                    "type": result.get("type"),
                    "preference": result.get("preference"),
                    "confidence": result.get("confidence", 0)
                })
            
            return preferences
            
        except Exception as e:
            logger.error(f"Error extracting user preferences: {e}")
            return []
    
    async def _find_optimization_opportunities(self) -> List[Dict[str, Any]]:
        """Find workflow optimization opportunities."""
        try:
            opportunities = []
            
            # Find slow workflows
            query = """
                SELECT workflow_name, average_time_seconds, execution_count
                FROM procedural_patterns
                WHERE average_time_seconds > 300
                  AND execution_count > 5
                ORDER BY average_time_seconds DESC
                LIMIT 5
            """
            
            rows = await self.db.fetch(query)
            
            for row in rows:
                opportunities.append({
                    "type": "slow_workflow",
                    "workflow": row['workflow_name'],
                    "current_duration": row['average_time_seconds'],
                    "potential_improvement": "30-50% reduction possible"
                })
            
            return opportunities
            
        except Exception as e:
            logger.error(f"Error finding optimization opportunities: {e}")
            return []
    
    async def _identify_trending_topics(self) -> List[Dict[str, Any]]:
        """Identify trending topics in recent memories."""
        try:
            # Query recent memories
            query = """
                SELECT decision_details
                FROM episodic_memories_v2
                WHERE created_at > $1
                LIMIT 100
            """
            
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            rows = await self.db.fetch(query, cutoff_date)
            
            # Extract topics
            topic_counts = defaultdict(int)
            
            for row in rows:
                details = json.loads(row['decision_details'])
                
                # Extract topics (simplified)
                if "genre" in details:
                    topic_counts[f"genre:{details['genre']}"] += 1
                if "platform" in details:
                    topic_counts[f"platform:{details['platform']}"] += 1
                for skill in details.get("required_skills", []):
                    topic_counts[f"skill:{skill}"] += 1
            
            # Sort by frequency
            trending = []
            for topic, count in sorted(
                topic_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]:
                trending.append({
                    "topic": topic,
                    "frequency": count,
                    "trend": "rising" if count > 5 else "stable"
                })
            
            return trending
            
        except Exception as e:
            logger.error(f"Error identifying trending topics: {e}")
            return []
    
    async def _calculate_memory_health(self) -> Dict[str, Any]:
        """Calculate memory system health metrics."""
        try:
            health = {
                "total_memories": 0,
                "avg_importance": 0.0,
                "avg_retention": 0.0,
                "fragmentation": 0.0,
                "consolidation_rate": 0.0
            }
            
            # Count total memories
            count_query = """
                SELECT COUNT(*) as total,
                       AVG(importance_score) as avg_importance
                FROM episodic_memories_v2
            """
            
            row = await self.db.fetchrow(count_query)
            if row:
                health["total_memories"] = int(row['total'])
                health["avg_importance"] = float(row['avg_importance']) if row['avg_importance'] else 0.0
            
            # Calculate average retention
            retention_query = """
                SELECT AVG(reinforcement_count) as avg_reinforcement
                FROM episodic_memories_v2
                WHERE last_accessed > $1
            """
            
            cutoff = datetime.utcnow() - timedelta(days=30)
            row = await self.db.fetchrow(retention_query, cutoff)
            if row and row['avg_reinforcement']:
                health["avg_retention"] = min(1.0, float(row['avg_reinforcement']) / 10)
            
            # Calculate fragmentation (scattered vs clustered memories)
            # Lower is better
            health["fragmentation"] = 0.2  # Placeholder
            
            # Calculate consolidation rate
            if self.metrics["total_consolidations"] > 0:
                health["consolidation_rate"] = (
                    self.metrics["memories_processed"] /
                    (self.metrics["total_consolidations"] * 100)
                )
            
            return health
            
        except Exception as e:
            logger.error(f"Error calculating memory health: {e}")
            return {}
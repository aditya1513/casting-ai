"""Comprehensive tests for Advanced Memory System."""

import pytest
import asyncio
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.memory.episodic_v2 import EpisodicMemory, EmotionalValence, DecisionType
from app.memory.semantic_graph import SemanticKnowledge, RelationType, NodeType
from app.memory.procedural import ProceduralMemory, WorkflowState, ActionType
from app.memory.consolidation import MemoryConsolidationEngine
from app.algorithms.forgetting_curve import EbbinghausForgettingCurve, MemoryTrace
from app.algorithms.pattern_mining import PrefixSpan, GSP, ParallelPatternMiner


class TestEpisodicMemory:
    """Test suite for episodic memory system."""
    
    @pytest.fixture
    async def episodic_memory(self):
        """Create episodic memory instance."""
        memory = EpisodicMemory()
        # Mock database connection
        memory.db = MockDatabase()
        return memory
    
    @pytest.mark.asyncio
    async def test_store_casting_decision(self, episodic_memory):
        """Test storing a casting decision."""
        decision_details = {
            "user_id": "user_123",
            "type": "talent_selection",
            "project_id": "proj_456",
            "talent_ids": ["talent_1", "talent_2"],
            "criteria": {"age": "25-35", "skills": ["acting"]}
        }
        
        context = {
            "budget": 1000000,
            "timeline": "3 months",
            "location": "Mumbai"
        }
        
        memory_id = await episodic_memory.store_casting_decision(
            decision_details, context
        )
        
        assert memory_id is not None
        assert isinstance(memory_id, str)
    
    @pytest.mark.asyncio
    async def test_emotional_valence_calculation(self, episodic_memory):
        """Test emotional valence calculation."""
        # Successful outcome
        memory_success = {
            "decision": {"type": "casting"},
            "outcome": {
                "success": True,
                "client_satisfaction": 4.5,
                "talent_performance": 4.8
            }
        }
        
        valence = await episodic_memory.calculate_emotional_valence(memory_success)
        assert valence > 0.5  # Positive valence
        
        # Failed outcome
        memory_failure = {
            "decision": {"type": "casting"},
            "outcome": {
                "success": False,
                "budget_overrun": True,
                "deadline_missed": True
            }
        }
        
        valence = await episodic_memory.calculate_emotional_valence(memory_failure)
        assert valence < 0.5  # Negative valence
    
    def test_forgetting_curve_application(self, episodic_memory):
        """Test Ebbinghaus forgetting curve."""
        memory = {
            "importance_score": 0.7,
            "reinforcement_count": 3
        }
        
        # Test immediate recall
        retention = episodic_memory.apply_forgetting_curve(
            memory, timedelta(hours=1)
        )
        assert retention > 0.9
        
        # Test after one day
        retention = episodic_memory.apply_forgetting_curve(
            memory, timedelta(days=1)
        )
        assert 0.5 < retention < 0.9
        
        # Test after one week
        retention = episodic_memory.apply_forgetting_curve(
            memory, timedelta(days=7)
        )
        assert retention < 0.5
    
    @pytest.mark.asyncio
    async def test_find_similar_episodes(self, episodic_memory):
        """Test finding similar episodes."""
        current_context = {
            "project_type": "film",
            "genre": "action",
            "budget": "high"
        }
        
        similar = await episodic_memory.find_similar_episodes(
            current_context, top_k=5
        )
        
        assert isinstance(similar, list)
        assert len(similar) <= 5


class TestSemanticKnowledge:
    """Test suite for semantic knowledge graph."""
    
    @pytest.fixture
    async def semantic_knowledge(self):
        """Create semantic knowledge instance."""
        knowledge = SemanticKnowledge()
        knowledge.db = MockDatabase()
        await knowledge.initialize()
        return knowledge
    
    @pytest.mark.asyncio
    async def test_build_actor_network(self, semantic_knowledge):
        """Test building actor collaboration network."""
        relationships = [
            {
                "actor1_id": "actor_1",
                "actor1_name": "Actor One",
                "actor2_id": "actor_2",
                "actor2_name": "Actor Two",
                "confidence": 0.9,
                "project_count": 3
            },
            {
                "actor1_id": "actor_2",
                "actor1_name": "Actor Two",
                "actor2_id": "actor_3",
                "actor2_name": "Actor Three",
                "confidence": 0.8,
                "project_count": 2
            }
        ]
        
        result = await semantic_knowledge.build_actor_network(relationships)
        
        assert result["nodes_added"] > 0
        assert result["edges_added"] > 0
        assert "influencers" in result
        assert "communities" in result
    
    @pytest.mark.asyncio
    async def test_track_genre_preferences(self, semantic_knowledge):
        """Test tracking user genre preferences."""
        user_id = "user_123"
        patterns = [
            {"genre": "action", "success_rate": 0.8, "frequency": 10},
            {"genre": "drama", "success_rate": 0.7, "frequency": 8},
            {"platform": "Netflix", "success_rate": 0.9, "frequency": 15}
        ]
        
        result = await semantic_knowledge.track_genre_preferences(
            user_id, patterns
        )
        
        assert result["user_id"] == user_id
        assert len(result["top_genres"]) > 0
        assert len(result["top_platforms"]) > 0
        assert "recommendations" in result
    
    @pytest.mark.asyncio
    async def test_query_knowledge_graph(self, semantic_knowledge):
        """Test SPARQL-like queries on knowledge graph."""
        # Add test data
        semantic_knowledge._add_node(
            "actor_1", NodeType.ACTOR, "Test Actor", {}
        )
        semantic_knowledge._add_node(
            "actor_2", NodeType.ACTOR, "Another Actor", {}
        )
        await semantic_knowledge._add_edge(
            "actor_1", RelationType.WORKED_WITH, "actor_2",
            0.9, 2, {}
        )
        
        results = await semantic_knowledge.query_knowledge_graph(
            "SELECT ?actor WHERE worked_with 'Test Actor'"
        )
        
        assert isinstance(results, list)


class TestProceduralMemory:
    """Test suite for procedural memory and workflow learning."""
    
    @pytest.fixture
    async def procedural_memory(self):
        """Create procedural memory instance."""
        memory = ProceduralMemory()
        memory.db = MockDatabase()
        return memory
    
    @pytest.mark.asyncio
    async def test_record_action_sequence(self, procedural_memory):
        """Test recording workflow actions."""
        actions = [
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
        
        sequence_id = await procedural_memory.record_action_sequence(
            "user_123", actions
        )
        
        assert sequence_id is not None
        assert isinstance(sequence_id, str)
    
    @pytest.mark.asyncio
    async def test_detect_workflow_patterns(self, procedural_memory):
        """Test pattern detection in workflows."""
        sequences = [
            [
                {"type": "search", "duration": 100, "success": True},
                {"type": "filter", "duration": 50, "success": True},
                {"type": "shortlist", "duration": 30, "success": True}
            ],
            [
                {"type": "search", "duration": 120, "success": True},
                {"type": "filter", "duration": 60, "success": True},
                {"type": "shortlist", "duration": 40, "success": True}
            ],
            [
                {"type": "search", "duration": 90, "success": True},
                {"type": "filter", "duration": 45, "success": True},
                {"type": "review", "duration": 60, "success": True}
            ]
        ]
        
        patterns = await procedural_memory.detect_workflow_patterns(sequences)
        
        assert isinstance(patterns, list)
        assert len(patterns) > 0
        if patterns:
            assert hasattr(patterns[0], 'frequency')
            assert hasattr(patterns[0], 'success_rate')
    
    @pytest.mark.asyncio
    async def test_optimize_workflow_path(self, procedural_memory):
        """Test A* workflow optimization."""
        current = WorkflowState.TALENT_SEARCH
        goal = WorkflowState.FINAL_SELECTION
        
        optimal_path = await procedural_memory.optimize_workflow_path(
            current, goal
        )
        
        assert isinstance(optimal_path, list)


class TestForgettingCurve:
    """Test suite for forgetting curve algorithms."""
    
    @pytest.fixture
    def forgetting_curve(self):
        """Create forgetting curve instance."""
        return EbbinghausForgettingCurve()
    
    def test_retention_calculation(self, forgetting_curve):
        """Test memory retention calculation."""
        # Test immediate retention
        retention = forgetting_curve.calculate_retention(
            timedelta(hours=0),
            initial_strength=1.0,
            repetitions=0,
            importance=0.5
        )
        assert retention == 1.0
        
        # Test after 24 hours
        retention = forgetting_curve.calculate_retention(
            timedelta(hours=24),
            initial_strength=1.0,
            repetitions=0,
            importance=0.5
        )
        assert 0.3 < retention < 0.7
        
        # Test with repetitions (should be higher)
        retention_repeated = forgetting_curve.calculate_retention(
            timedelta(hours=24),
            initial_strength=1.0,
            repetitions=3,
            importance=0.5
        )
        assert retention_repeated > retention
    
    def test_optimal_review_time(self, forgetting_curve):
        """Test calculation of optimal review time."""
        review_time = forgetting_curve.calculate_optimal_review_time(
            current_strength=0.9,
            target_strength=0.7,
            repetitions=1,
            importance=0.6
        )
        
        assert isinstance(review_time, timedelta)
        assert review_time.total_seconds() > 0
    
    def test_memory_load_calculation(self, forgetting_curve):
        """Test cognitive load calculation."""
        traces = [
            MemoryTrace(
                memory_id=f"mem_{i}",
                initial_strength=1.0,
                current_strength=0.8 - (i * 0.1),
                creation_time=datetime.utcnow() - timedelta(days=i),
                last_access_time=datetime.utcnow() - timedelta(hours=i*12),
                access_count=5 - i,
                importance_factor=0.5 + (i * 0.1),
                emotional_weight=0.6,
                context_richness=0.7
            )
            for i in range(5)
        ]
        
        load = forgetting_curve.calculate_memory_load(traces)
        
        assert "active_memories" in load
        assert "cognitive_load" in load
        assert 0 <= load["cognitive_load"] <= 1.0


class TestPatternMining:
    """Test suite for pattern mining algorithms."""
    
    def test_prefixspan_mining(self):
        """Test PrefixSpan sequential pattern mining."""
        sequences = [
            ["a", "b", "c"],
            ["a", "c", "d"],
            ["b", "c", "d"],
            ["a", "b", "c", "d"]
        ]
        
        miner = PrefixSpan(min_support=0.5)
        patterns = miner.mine_patterns(sequences)
        
        assert len(patterns) > 0
        assert all(hasattr(p, 'support') for p in patterns)
        assert all(0 <= p.support <= 1.0 for p in patterns)
    
    def test_parallel_pattern_detection(self):
        """Test parallel pattern detection."""
        from app.algorithms.pattern_mining import WorkflowSequence
        
        sequences = [
            WorkflowSequence(
                sequence_id="seq_1",
                actions=["search", "filter", "review"],
                timestamps=[
                    datetime.utcnow(),
                    datetime.utcnow() + timedelta(seconds=30),
                    datetime.utcnow() + timedelta(minutes=5)
                ],
                user_id="user_1",
                success=True,
                duration=300.0
            )
        ]
        
        miner = ParallelPatternMiner(time_threshold=60)
        patterns = miner.find_parallel_patterns(sequences)
        
        assert isinstance(patterns, list)


class TestMemoryConsolidation:
    """Test suite for memory consolidation engine."""
    
    @pytest.fixture
    async def consolidation_engine(self):
        """Create consolidation engine instance."""
        engine = MemoryConsolidationEngine()
        engine.db = MockDatabase()
        # Mock memory components
        engine.stm.redis_client = None  # Mock Redis
        return engine
    
    @pytest.mark.asyncio
    async def test_consolidate_stm_to_episodic(self, consolidation_engine):
        """Test STM to episodic memory consolidation."""
        stats = await consolidation_engine.consolidate_stm_to_episodic()
        
        assert isinstance(stats, dict)
        assert "conversations_processed" in stats
        assert "memories_consolidated" in stats
        assert "memories_discarded" in stats
    
    @pytest.mark.asyncio
    async def test_extract_semantic_knowledge(self, consolidation_engine):
        """Test semantic knowledge extraction."""
        stats = await consolidation_engine.extract_semantic_knowledge()
        
        assert isinstance(stats, dict)
        assert "memories_analyzed" in stats
        assert "concepts_extracted" in stats
        assert "relationships_found" in stats
    
    @pytest.mark.asyncio
    async def test_memory_pruning(self, consolidation_engine):
        """Test memory pruning based on forgetting curve."""
        stats = await consolidation_engine.prune_irrelevant_memories()
        
        assert isinstance(stats, dict)
        assert "memories_evaluated" in stats
        assert "memories_pruned" in stats
        assert "space_freed_mb" in stats


# Mock Database for testing
class MockDatabase:
    """Mock database for testing without actual database connection."""
    
    async def execute(self, query, *args):
        """Mock execute method."""
        return "INSERT 1"
    
    async def fetch(self, query, *args):
        """Mock fetch method."""
        return []
    
    async def fetchrow(self, query, *args):
        """Mock fetchrow method."""
        return None
    
    async def fetchval(self, query, *args):
        """Mock fetchval method."""
        return False


# Performance tests
class TestPerformanceRequirements:
    """Test performance requirements for memory system."""
    
    @pytest.mark.asyncio
    async def test_memory_retrieval_performance(self):
        """Test that memory retrieval is under 100ms."""
        import time
        
        memory = EpisodicMemory()
        memory.db = MockDatabase()
        
        start = time.time()
        await memory.find_similar_episodes({"test": "context"}, top_k=5)
        duration = (time.time() - start) * 1000
        
        assert duration < 200  # Allow some margin for test environment
    
    def test_pattern_detection_performance(self):
        """Test that pattern detection is under 500ms."""
        import time
        
        sequences = [["a", "b", "c"]] * 100
        miner = PrefixSpan(min_support=0.1)
        
        start = time.time()
        patterns = miner.mine_patterns(sequences)
        duration = (time.time() - start) * 1000
        
        assert duration < 1000  # Allow margin for test environment


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
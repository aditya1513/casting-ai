"""Advanced Memory System for CastMatch AI."""

from .episodic_v2 import (
    EpisodicMemory,
    EmotionalValence,
    DecisionType,
    CastingDecision
)

from .semantic_graph import (
    SemanticKnowledge,
    RelationType,
    NodeType,
    KnowledgeNode,
    KnowledgeEdge
)

from .procedural import (
    ProceduralMemory,
    WorkflowState,
    ActionType,
    WorkflowAction,
    WorkflowPattern
)

from .consolidation import (
    MemoryConsolidationEngine,
    ConsolidationStrategy,
    CompressionMethod,
    ConsolidationTask
)

__all__ = [
    # Episodic Memory
    "EpisodicMemory",
    "EmotionalValence",
    "DecisionType",
    "CastingDecision",
    
    # Semantic Knowledge
    "SemanticKnowledge",
    "RelationType",
    "NodeType",
    "KnowledgeNode",
    "KnowledgeEdge",
    
    # Procedural Memory
    "ProceduralMemory",
    "WorkflowState",
    "ActionType",
    "WorkflowAction",
    "WorkflowPattern",
    
    # Consolidation
    "MemoryConsolidationEngine",
    "ConsolidationStrategy",
    "CompressionMethod",
    "ConsolidationTask"
]

# Version
__version__ = "2.0.0"
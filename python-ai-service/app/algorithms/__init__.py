"""Memory Algorithms for CastMatch AI."""

from .forgetting_curve import (
    EbbinghausForgettingCurve,
    MemoryStrength,
    SpacingInterval,
    MemoryTrace
)

from .pattern_mining import (
    PrefixSpan,
    GSP,
    ParallelPatternMiner,
    ConditionalPatternMiner,
    CyclicPatternDetector,
    HierarchicalPatternMiner,
    PatternType,
    SequencePattern,
    WorkflowSequence
)

__all__ = [
    # Forgetting Curve
    "EbbinghausForgettingCurve",
    "MemoryStrength",
    "SpacingInterval",
    "MemoryTrace",
    
    # Pattern Mining
    "PrefixSpan",
    "GSP",
    "ParallelPatternMiner",
    "ConditionalPatternMiner",
    "CyclicPatternDetector",
    "HierarchicalPatternMiner",
    "PatternType",
    "SequencePattern",
    "WorkflowSequence"
]

# Version
__version__ = "2.0.0"
"""Sequential Pattern Mining Algorithms for Workflow Learning."""

import numpy as np
from typing import List, Dict, Any, Tuple, Set, Optional
from collections import defaultdict, Counter
from dataclasses import dataclass
from enum import Enum
from loguru import logger
import itertools
from datetime import datetime, timedelta


class PatternType(Enum):
    """Types of patterns to mine."""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    CONDITIONAL = "conditional"
    CYCLIC = "cyclic"
    HIERARCHICAL = "hierarchical"


@dataclass
class SequencePattern:
    """Represents a discovered sequence pattern."""
    pattern_id: str
    sequence: List[str]
    support: float  # Frequency of occurrence
    confidence: float  # Reliability of pattern
    lift: float  # Strength of association
    pattern_type: PatternType
    metadata: Dict[str, Any]


@dataclass
class WorkflowSequence:
    """Represents a workflow execution sequence."""
    sequence_id: str
    actions: List[str]
    timestamps: List[datetime]
    user_id: str
    success: bool
    duration: float


class PrefixSpan:
    """
    PrefixSpan algorithm for sequential pattern mining.
    Efficient for finding frequent sequential patterns in workflows.
    """
    
    def __init__(self, min_support: float = 0.1, max_pattern_length: int = 10):
        self.min_support = min_support
        self.max_pattern_length = max_pattern_length
        self.patterns = []
        
    def mine_patterns(
        self,
        sequences: List[List[str]]
    ) -> List[SequencePattern]:
        """
        Mine sequential patterns from sequences.
        
        Args:
            sequences: List of action sequences
            
        Returns:
            List of discovered patterns
        """
        try:
            if not sequences:
                return []
            
            # Calculate minimum support count
            min_support_count = max(1, int(self.min_support * len(sequences)))
            
            # Find frequent 1-sequences
            frequent_items = self._find_frequent_items(sequences, min_support_count)
            
            # Build prefix tree and mine patterns
            patterns = []
            for item in frequent_items:
                prefix = [item]
                projected = self._project_sequences(sequences, prefix)
                patterns.extend(
                    self._mine_recursive(prefix, projected, min_support_count, sequences)
                )
            
            # Convert to SequencePattern objects
            result_patterns = []
            for pattern, support in patterns:
                if len(pattern) >= 2:  # Only patterns with 2+ items
                    seq_pattern = SequencePattern(
                        pattern_id=f"pat_{hash(tuple(pattern))}",
                        sequence=pattern,
                        support=support / len(sequences),
                        confidence=self._calculate_confidence(pattern, sequences),
                        lift=self._calculate_lift(pattern, sequences),
                        pattern_type=PatternType.SEQUENTIAL,
                        metadata={"occurrences": int(support)}
                    )
                    result_patterns.append(seq_pattern)
            
            # Sort by support and length
            result_patterns.sort(
                key=lambda p: (p.support, len(p.sequence)),
                reverse=True
            )
            
            logger.info(f"Mined {len(result_patterns)} sequential patterns")
            return result_patterns[:100]  # Limit to top 100 patterns
            
        except Exception as e:
            logger.error(f"Error mining patterns: {e}")
            return []
    
    def _find_frequent_items(
        self,
        sequences: List[List[str]],
        min_support: int
    ) -> List[str]:
        """Find frequent 1-items."""
        item_counts = Counter()
        
        for sequence in sequences:
            unique_items = set(sequence)
            for item in unique_items:
                item_counts[item] += 1
        
        frequent = [
            item for item, count in item_counts.items()
            if count >= min_support
        ]
        
        return sorted(frequent)
    
    def _project_sequences(
        self,
        sequences: List[List[str]],
        prefix: List[str]
    ) -> List[List[str]]:
        """Project sequences based on prefix."""
        projected = []
        
        for sequence in sequences:
            # Find prefix in sequence
            suffix = self._find_suffix(sequence, prefix)
            if suffix:
                projected.append(suffix)
        
        return projected
    
    def _find_suffix(
        self,
        sequence: List[str],
        prefix: List[str]
    ) -> Optional[List[str]]:
        """Find suffix after prefix in sequence."""
        for i in range(len(sequence) - len(prefix) + 1):
            if sequence[i:i+len(prefix)] == prefix:
                return sequence[i+len(prefix):]
        return None
    
    def _mine_recursive(
        self,
        prefix: List[str],
        projected: List[List[str]],
        min_support: int,
        all_sequences: List[List[str]]
    ) -> List[Tuple[List[str], int]]:
        """Recursively mine patterns."""
        patterns = []
        
        # Add current prefix as pattern
        support = len([s for s in all_sequences if self._contains_pattern(s, prefix)])
        if support >= min_support:
            patterns.append((prefix.copy(), support))
        
        # Stop if max length reached
        if len(prefix) >= self.max_pattern_length:
            return patterns
        
        # Find frequent items in projected sequences
        item_counts = Counter()
        for sequence in projected:
            if sequence:
                unique_items = set(sequence)
                for item in unique_items:
                    item_counts[item] += 1
        
        # Recursively mine with extended prefixes
        for item, count in item_counts.items():
            if count >= min_support:
                new_prefix = prefix + [item]
                new_projected = self._project_sequences(projected, [item])
                patterns.extend(
                    self._mine_recursive(
                        new_prefix, new_projected, min_support, all_sequences
                    )
                )
        
        return patterns
    
    def _contains_pattern(
        self,
        sequence: List[str],
        pattern: List[str]
    ) -> bool:
        """Check if sequence contains pattern."""
        if len(pattern) > len(sequence):
            return False
        
        for i in range(len(sequence) - len(pattern) + 1):
            if sequence[i:i+len(pattern)] == pattern:
                return True
        return False
    
    def _calculate_confidence(
        self,
        pattern: List[str],
        sequences: List[List[str]]
    ) -> float:
        """Calculate pattern confidence."""
        if len(pattern) < 2:
            return 0.0
        
        # Confidence = P(pattern) / P(prefix)
        pattern_count = sum(1 for s in sequences if self._contains_pattern(s, pattern))
        prefix_count = sum(1 for s in sequences if self._contains_pattern(s, pattern[:-1]))
        
        if prefix_count == 0:
            return 0.0
        
        return pattern_count / prefix_count
    
    def _calculate_lift(
        self,
        pattern: List[str],
        sequences: List[List[str]]
    ) -> float:
        """Calculate pattern lift."""
        if len(pattern) < 2:
            return 1.0
        
        # Lift = P(pattern) / (P(first) * P(last))
        pattern_prob = sum(1 for s in sequences if self._contains_pattern(s, pattern)) / len(sequences)
        first_prob = sum(1 for s in sequences if pattern[0] in s) / len(sequences)
        last_prob = sum(1 for s in sequences if pattern[-1] in s) / len(sequences)
        
        if first_prob == 0 or last_prob == 0:
            return 0.0
        
        return pattern_prob / (first_prob * last_prob)


class GSP:
    """
    Generalized Sequential Pattern (GSP) algorithm.
    Handles time constraints and sliding windows.
    """
    
    def __init__(
        self,
        min_support: float = 0.1,
        max_gap: int = 3,
        min_gap: int = 0,
        window_size: int = 5
    ):
        self.min_support = min_support
        self.max_gap = max_gap  # Maximum gap between elements
        self.min_gap = min_gap  # Minimum gap between elements
        self.window_size = window_size  # Time window for patterns
        
    def mine_patterns_with_constraints(
        self,
        sequences: List[WorkflowSequence]
    ) -> List[SequencePattern]:
        """
        Mine patterns with time constraints.
        
        Args:
            sequences: List of workflow sequences with timestamps
            
        Returns:
            List of patterns satisfying constraints
        """
        try:
            patterns = []
            min_support_count = max(1, int(self.min_support * len(sequences)))
            
            # Convert to itemsets with timestamps
            timed_sequences = []
            for seq in sequences:
                timed_seq = list(zip(seq.actions, seq.timestamps))
                timed_sequences.append(timed_seq)
            
            # Find frequent 1-sequences
            frequent_items = self._find_frequent_timed_items(
                timed_sequences, min_support_count
            )
            
            # Generate candidate patterns
            k = 2
            current_patterns = [[item] for item in frequent_items]
            
            while current_patterns and k <= self.window_size:
                # Generate k-candidates
                candidates = self._generate_candidates(current_patterns)
                
                # Prune candidates based on support and constraints
                frequent_patterns = self._prune_candidates(
                    candidates, timed_sequences, min_support_count
                )
                
                # Convert to SequencePattern objects
                for pattern in frequent_patterns:
                    support = self._calculate_timed_support(pattern, timed_sequences)
                    
                    seq_pattern = SequencePattern(
                        pattern_id=f"gsp_{hash(tuple(pattern))}",
                        sequence=pattern,
                        support=support,
                        confidence=0.8,  # Placeholder
                        lift=1.0,  # Placeholder
                        pattern_type=PatternType.SEQUENTIAL,
                        metadata={
                            "max_gap": self.max_gap,
                            "min_gap": self.min_gap
                        }
                    )
                    patterns.append(seq_pattern)
                
                current_patterns = frequent_patterns
                k += 1
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error in GSP mining: {e}")
            return []
    
    def _find_frequent_timed_items(
        self,
        sequences: List[List[Tuple[str, datetime]]],
        min_support: int
    ) -> List[str]:
        """Find frequent items in timed sequences."""
        item_counts = Counter()
        
        for sequence in sequences:
            unique_items = set(action for action, _ in sequence)
            for item in unique_items:
                item_counts[item] += 1
        
        return [
            item for item, count in item_counts.items()
            if count >= min_support
        ]
    
    def _generate_candidates(
        self,
        patterns: List[List[str]]
    ) -> List[List[str]]:
        """Generate candidate patterns."""
        candidates = []
        
        for p1 in patterns:
            for p2 in patterns:
                # Try joining patterns
                if p1[:-1] == p2[:-1]:
                    candidate = p1 + [p2[-1]]
                    if candidate not in candidates:
                        candidates.append(candidate)
        
        return candidates
    
    def _prune_candidates(
        self,
        candidates: List[List[str]],
        sequences: List[List[Tuple[str, datetime]]],
        min_support: int
    ) -> List[List[str]]:
        """Prune candidates based on support and constraints."""
        frequent = []
        
        for candidate in candidates:
            support = 0
            
            for sequence in sequences:
                if self._satisfies_constraints(candidate, sequence):
                    support += 1
            
            if support >= min_support:
                frequent.append(candidate)
        
        return frequent
    
    def _satisfies_constraints(
        self,
        pattern: List[str],
        sequence: List[Tuple[str, datetime]]
    ) -> bool:
        """Check if pattern satisfies time constraints in sequence."""
        # Find pattern in sequence with time constraints
        for start_idx in range(len(sequence) - len(pattern) + 1):
            valid = True
            prev_time = None
            pattern_idx = 0
            
            for seq_idx in range(start_idx, len(sequence)):
                if pattern_idx >= len(pattern):
                    break
                
                action, timestamp = sequence[seq_idx]
                
                if action == pattern[pattern_idx]:
                    if prev_time:
                        # Check gap constraints
                        gap = (timestamp - prev_time).total_seconds()
                        if gap < self.min_gap or gap > self.max_gap * 3600:
                            valid = False
                            break
                    
                    prev_time = timestamp
                    pattern_idx += 1
            
            if valid and pattern_idx == len(pattern):
                return True
        
        return False
    
    def _calculate_timed_support(
        self,
        pattern: List[str],
        sequences: List[List[Tuple[str, datetime]]]
    ) -> float:
        """Calculate support for timed pattern."""
        count = sum(
            1 for seq in sequences
            if self._satisfies_constraints(pattern, seq)
        )
        return count / len(sequences) if sequences else 0.0


class ParallelPatternMiner:
    """
    Mines patterns of actions that can be executed in parallel.
    """
    
    def __init__(self, time_threshold: int = 60):
        self.time_threshold = time_threshold  # Seconds to consider as parallel
        
    def find_parallel_patterns(
        self,
        sequences: List[WorkflowSequence]
    ) -> List[SequencePattern]:
        """
        Find actions that frequently occur in parallel.
        
        Args:
            sequences: List of workflow sequences with timestamps
            
        Returns:
            List of parallel patterns
        """
        try:
            parallel_pairs = defaultdict(int)
            total_sequences = len(sequences)
            
            for seq in sequences:
                # Find actions occurring within time threshold
                for i in range(len(seq.timestamps)):
                    for j in range(i + 1, len(seq.timestamps)):
                        time_diff = (seq.timestamps[j] - seq.timestamps[i]).total_seconds()
                        
                        if time_diff <= self.time_threshold:
                            # Actions can be parallel
                            pair = tuple(sorted([seq.actions[i], seq.actions[j]]))
                            parallel_pairs[pair] += 1
                        else:
                            break  # No need to check further
            
            # Convert to patterns
            patterns = []
            for pair, count in parallel_pairs.items():
                if count >= 2:  # Minimum frequency
                    support = count / total_sequences
                    
                    pattern = SequencePattern(
                        pattern_id=f"par_{hash(pair)}",
                        sequence=list(pair),
                        support=support,
                        confidence=1.0,
                        lift=1.0,
                        pattern_type=PatternType.PARALLEL,
                        metadata={
                            "occurrences": count,
                            "time_threshold": self.time_threshold
                        }
                    )
                    patterns.append(pattern)
            
            return sorted(patterns, key=lambda p: p.support, reverse=True)
            
        except Exception as e:
            logger.error(f"Error finding parallel patterns: {e}")
            return []


class ConditionalPatternMiner:
    """
    Mines conditional patterns (if-then rules) in workflows.
    """
    
    def __init__(self, min_confidence: float = 0.7):
        self.min_confidence = min_confidence
        
    def mine_conditional_patterns(
        self,
        sequences: List[List[str]],
        context_data: Optional[List[Dict[str, Any]]] = None
    ) -> List[SequencePattern]:
        """
        Mine if-then patterns from sequences.
        
        Args:
            sequences: List of action sequences
            context_data: Optional context for each sequence
            
        Returns:
            List of conditional patterns
        """
        try:
            patterns = []
            
            # Build association rules
            rules = self._build_association_rules(sequences)
            
            for antecedent, consequent, confidence, support in rules:
                if confidence >= self.min_confidence:
                    pattern = SequencePattern(
                        pattern_id=f"cond_{hash((antecedent, consequent))}",
                        sequence=[f"IF {antecedent}", f"THEN {consequent}"],
                        support=support,
                        confidence=confidence,
                        lift=1.0,
                        pattern_type=PatternType.CONDITIONAL,
                        metadata={
                            "antecedent": antecedent,
                            "consequent": consequent
                        }
                    )
                    patterns.append(pattern)
            
            # Add context-based patterns if available
            if context_data:
                context_patterns = self._mine_context_patterns(
                    sequences, context_data
                )
                patterns.extend(context_patterns)
            
            return sorted(patterns, key=lambda p: p.confidence, reverse=True)
            
        except Exception as e:
            logger.error(f"Error mining conditional patterns: {e}")
            return []
    
    def _build_association_rules(
        self,
        sequences: List[List[str]]
    ) -> List[Tuple[str, str, float, float]]:
        """Build association rules from sequences."""
        rules = []
        
        # Count co-occurrences
        item_counts = Counter()
        pair_counts = Counter()
        
        for sequence in sequences:
            unique_items = set(sequence)
            for item in unique_items:
                item_counts[item] += 1
            
            # Count pairs
            for i, item1 in enumerate(sequence[:-1]):
                item2 = sequence[i + 1]
                pair_counts[(item1, item2)] += 1
        
        # Generate rules
        total_sequences = len(sequences)
        
        for (antecedent, consequent), count in pair_counts.items():
            if item_counts[antecedent] > 0:
                confidence = count / item_counts[antecedent]
                support = count / total_sequences
                
                rules.append((antecedent, consequent, confidence, support))
        
        return rules
    
    def _mine_context_patterns(
        self,
        sequences: List[List[str]],
        context_data: List[Dict[str, Any]]
    ) -> List[SequencePattern]:
        """Mine patterns based on context."""
        patterns = []
        
        # Group sequences by context attributes
        context_groups = defaultdict(list)
        
        for i, context in enumerate(context_data):
            if i < len(sequences):
                # Group by key context attributes
                key = str(context.get("type", "unknown"))
                context_groups[key].append(sequences[i])
        
        # Find patterns specific to each context
        for context_key, group_sequences in context_groups.items():
            if len(group_sequences) >= 2:
                # Find most common pattern in this context
                pattern_counts = Counter()
                
                for seq in group_sequences:
                    # Use 2-grams as patterns
                    for i in range(len(seq) - 1):
                        pattern = (seq[i], seq[i + 1])
                        pattern_counts[pattern] += 1
                
                # Add significant patterns
                for pattern, count in pattern_counts.most_common(3):
                    support = count / len(group_sequences)
                    
                    if support > 0.5:
                        seq_pattern = SequencePattern(
                            pattern_id=f"ctx_{hash((context_key, pattern))}",
                            sequence=[f"CONTEXT:{context_key}"] + list(pattern),
                            support=support,
                            confidence=0.8,
                            lift=1.0,
                            pattern_type=PatternType.CONDITIONAL,
                            metadata={"context": context_key}
                        )
                        patterns.append(seq_pattern)
        
        return patterns


class CyclicPatternDetector:
    """
    Detects cyclic or repeating patterns in workflows.
    """
    
    def __init__(self, min_cycle_length: int = 2, max_cycle_length: int = 10):
        self.min_cycle_length = min_cycle_length
        self.max_cycle_length = max_cycle_length
        
    def detect_cycles(
        self,
        sequences: List[List[str]]
    ) -> List[SequencePattern]:
        """
        Detect cyclic patterns in sequences.
        
        Args:
            sequences: List of action sequences
            
        Returns:
            List of cyclic patterns
        """
        try:
            patterns = []
            
            for sequence in sequences:
                # Find repeating subsequences
                cycles = self._find_cycles_in_sequence(sequence)
                
                for cycle, count in cycles:
                    if count >= 2:  # At least 2 repetitions
                        pattern = SequencePattern(
                            pattern_id=f"cyc_{hash(tuple(cycle))}",
                            sequence=cycle,
                            support=1.0,  # Found in this sequence
                            confidence=count / len(sequence),
                            lift=1.0,
                            pattern_type=PatternType.CYCLIC,
                            metadata={"repetitions": count}
                        )
                        patterns.append(pattern)
            
            # Deduplicate and aggregate patterns
            unique_patterns = self._aggregate_patterns(patterns)
            
            return sorted(unique_patterns, key=lambda p: p.support, reverse=True)
            
        except Exception as e:
            logger.error(f"Error detecting cycles: {e}")
            return []
    
    def _find_cycles_in_sequence(
        self,
        sequence: List[str]
    ) -> List[Tuple[List[str], int]]:
        """Find repeating cycles in a single sequence."""
        cycles = []
        
        for length in range(self.min_cycle_length, min(self.max_cycle_length + 1, len(sequence) // 2)):
            for start in range(len(sequence) - length):
                pattern = sequence[start:start + length]
                count = self._count_pattern_occurrences(sequence, pattern)
                
                if count >= 2:
                    cycles.append((pattern, count))
        
        return cycles
    
    def _count_pattern_occurrences(
        self,
        sequence: List[str],
        pattern: List[str]
    ) -> int:
        """Count occurrences of pattern in sequence."""
        count = 0
        i = 0
        
        while i <= len(sequence) - len(pattern):
            if sequence[i:i + len(pattern)] == pattern:
                count += 1
                i += len(pattern)  # Non-overlapping
            else:
                i += 1
        
        return count
    
    def _aggregate_patterns(
        self,
        patterns: List[SequencePattern]
    ) -> List[SequencePattern]:
        """Aggregate duplicate patterns."""
        pattern_map = {}
        
        for pattern in patterns:
            key = tuple(pattern.sequence)
            
            if key in pattern_map:
                # Update existing pattern
                existing = pattern_map[key]
                existing.support += pattern.support
                existing.metadata["total_repetitions"] = (
                    existing.metadata.get("total_repetitions", 0) +
                    pattern.metadata.get("repetitions", 0)
                )
            else:
                pattern_map[key] = pattern
        
        # Normalize support
        total = len(pattern_map)
        for pattern in pattern_map.values():
            pattern.support = pattern.support / total if total > 0 else 0
        
        return list(pattern_map.values())


class HierarchicalPatternMiner:
    """
    Mines hierarchical patterns showing parent-child relationships.
    """
    
    def __init__(self):
        self.hierarchy_levels = {}
        
    def mine_hierarchical_patterns(
        self,
        sequences: List[List[str]],
        action_hierarchy: Optional[Dict[str, str]] = None
    ) -> List[SequencePattern]:
        """
        Mine hierarchical patterns from sequences.
        
        Args:
            sequences: List of action sequences
            action_hierarchy: Optional hierarchy mapping (child -> parent)
            
        Returns:
            List of hierarchical patterns
        """
        try:
            patterns = []
            
            # Build hierarchy if not provided
            if not action_hierarchy:
                action_hierarchy = self._infer_hierarchy(sequences)
            
            # Find patterns at different hierarchy levels
            abstracted_sequences = self._abstract_sequences(
                sequences, action_hierarchy
            )
            
            # Mine patterns at abstract level
            abstract_miner = PrefixSpan(min_support=0.2)
            abstract_patterns = abstract_miner.mine_patterns(abstracted_sequences)
            
            for pattern in abstract_patterns:
                pattern.pattern_type = PatternType.HIERARCHICAL
                pattern.metadata["level"] = "abstract"
                patterns.append(pattern)
            
            # Find concrete realizations
            concrete_patterns = self._find_concrete_realizations(
                abstract_patterns, sequences, action_hierarchy
            )
            patterns.extend(concrete_patterns)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error mining hierarchical patterns: {e}")
            return []
    
    def _infer_hierarchy(
        self,
        sequences: List[List[str]]
    ) -> Dict[str, str]:
        """Infer action hierarchy from sequences."""
        hierarchy = {}
        
        # Simple heuristic: group by common prefixes
        all_actions = set()
        for seq in sequences:
            all_actions.update(seq)
        
        # Group by first word (if multi-word actions)
        for action in all_actions:
            parts = action.split("_")
            if len(parts) > 1:
                parent = parts[0]
                hierarchy[action] = parent
            else:
                hierarchy[action] = "root"
        
        return hierarchy
    
    def _abstract_sequences(
        self,
        sequences: List[List[str]],
        hierarchy: Dict[str, str]
    ) -> List[List[str]]:
        """Abstract sequences using hierarchy."""
        abstracted = []
        
        for sequence in sequences:
            abstract_seq = [
                hierarchy.get(action, action)
                for action in sequence
            ]
            abstracted.append(abstract_seq)
        
        return abstracted
    
    def _find_concrete_realizations(
        self,
        abstract_patterns: List[SequencePattern],
        sequences: List[List[str]],
        hierarchy: Dict[str, str]
    ) -> List[SequencePattern]:
        """Find concrete realizations of abstract patterns."""
        concrete = []
        
        for abstract_pattern in abstract_patterns[:5]:  # Top 5 abstract patterns
            # Find all concrete sequences matching abstract pattern
            matching_sequences = []
            
            for sequence in sequences:
                abstract_seq = [hierarchy.get(a, a) for a in sequence]
                
                # Check if abstract pattern is in abstract sequence
                pattern_found = False
                for i in range(len(abstract_seq) - len(abstract_pattern.sequence) + 1):
                    if abstract_seq[i:i+len(abstract_pattern.sequence)] == abstract_pattern.sequence:
                        # Extract corresponding concrete pattern
                        concrete_pattern = sequence[i:i+len(abstract_pattern.sequence)]
                        matching_sequences.append(concrete_pattern)
                        pattern_found = True
                        break
            
            # Count unique concrete patterns
            concrete_counts = Counter(tuple(seq) for seq in matching_sequences)
            
            for concrete_seq, count in concrete_counts.most_common(3):
                if count >= 2:
                    pattern = SequencePattern(
                        pattern_id=f"hier_{hash(concrete_seq)}",
                        sequence=list(concrete_seq),
                        support=count / len(sequences),
                        confidence=count / len(matching_sequences) if matching_sequences else 0,
                        lift=1.0,
                        pattern_type=PatternType.HIERARCHICAL,
                        metadata={
                            "level": "concrete",
                            "abstract_pattern": abstract_pattern.sequence
                        }
                    )
                    concrete.append(pattern)
        
        return concrete
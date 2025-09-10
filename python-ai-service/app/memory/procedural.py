"""Procedural Memory System for workflow learning and optimization."""

import uuid
import json
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, Counter
import asyncpg
from loguru import logger
import heapq

from app.database.connection import async_db
from app.core.config import settings


class WorkflowState(Enum):
    """States in a casting workflow."""
    INITIAL = "initial"
    TALENT_SEARCH = "talent_search"
    SHORTLISTING = "shortlisting"
    AUDITION_SCHEDULING = "audition_scheduling"
    AUDITION_REVIEW = "audition_review"
    DIRECTOR_REVIEW = "director_review"
    NEGOTIATION = "negotiation"
    FINAL_SELECTION = "final_selection"
    CONTRACT_SIGNING = "contract_signing"
    COMPLETED = "completed"


class ActionType(Enum):
    """Types of actions in workflows."""
    SEARCH = "search"
    FILTER = "filter"
    SHORTLIST = "shortlist"
    SCHEDULE = "schedule"
    REVIEW = "review"
    APPROVE = "approve"
    REJECT = "reject"
    NEGOTIATE = "negotiate"
    FINALIZE = "finalize"


@dataclass
class WorkflowAction:
    """Individual action in a workflow."""
    action_id: str
    action_type: ActionType
    state_from: WorkflowState
    state_to: WorkflowState
    parameters: Dict[str, Any]
    duration_seconds: int
    success: bool
    timestamp: datetime


@dataclass
class WorkflowPattern:
    """Learned workflow pattern."""
    pattern_id: str
    name: str
    action_sequence: List[WorkflowAction]
    frequency: int
    success_rate: float
    avg_duration: float
    optimization_potential: float


class ProceduralMemory:
    """System for learning and optimizing casting workflows."""
    
    def __init__(self):
        self.db = async_db
        self.min_pattern_frequency = 3  # Minimum occurrences to consider a pattern
        self.success_threshold = 0.7  # Minimum success rate for good practices
        self.optimization_threshold = 0.2  # 20% time reduction to suggest optimization
        
    async def record_action_sequence(
        self,
        user_id: str,
        actions: List[Dict[str, Any]]
    ) -> str:
        """
        Record a sequence of actions performed by a user.
        
        Args:
            user_id: User identifier
            actions: List of action data
            
        Returns:
            Sequence ID
        """
        try:
            sequence_id = str(uuid.uuid4())
            workflow_name = self._generate_workflow_name(actions)
            
            # Calculate sequence metrics
            total_duration = sum(a.get('duration', 0) for a in actions)
            success_count = sum(1 for a in actions if a.get('success', False))
            success_rate = success_count / len(actions) if actions else 0
            
            # Convert actions to structured format
            structured_actions = []
            for i, action in enumerate(actions):
                structured_action = {
                    "index": i,
                    "type": action.get('type'),
                    "state_from": action.get('state_from'),
                    "state_to": action.get('state_to'),
                    "parameters": action.get('parameters', {}),
                    "duration": action.get('duration', 0),
                    "success": action.get('success', True),
                    "timestamp": action.get('timestamp', datetime.utcnow().isoformat())
                }
                structured_actions.append(structured_action)
            
            # Store in database
            query = """
                INSERT INTO procedural_patterns (
                    id, user_id, workflow_name, action_sequence,
                    success_rate, execution_count, average_time_seconds,
                    optimization_suggestions, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """
            
            await self.db.execute(
                query,
                uuid.UUID(sequence_id),
                uuid.UUID(user_id) if user_id else None,
                workflow_name,
                json.dumps(structured_actions),
                success_rate,
                1,  # Initial execution count
                total_duration,
                json.dumps([]),  # Empty suggestions initially
                datetime.utcnow()
            )
            
            # Check for pattern detection opportunities
            await self._update_pattern_library(user_id, structured_actions)
            
            logger.info(f"Recorded action sequence: {sequence_id}")
            return sequence_id
            
        except Exception as e:
            logger.error(f"Error recording action sequence: {e}")
            raise
    
    async def detect_workflow_patterns(
        self,
        sequences: List[List[Dict[str, Any]]]
    ) -> List[WorkflowPattern]:
        """
        Detect common patterns in workflow sequences.
        
        Args:
            sequences: List of action sequences
            
        Returns:
            List of detected patterns
        """
        try:
            patterns = []
            
            # Use sequential pattern mining
            frequent_patterns = self._mine_sequential_patterns(sequences)
            
            for pattern_data in frequent_patterns:
                pattern = WorkflowPattern(
                    pattern_id=str(uuid.uuid4()),
                    name=pattern_data['name'],
                    action_sequence=pattern_data['sequence'],
                    frequency=pattern_data['frequency'],
                    success_rate=pattern_data['success_rate'],
                    avg_duration=pattern_data['avg_duration'],
                    optimization_potential=pattern_data['optimization_potential']
                )
                patterns.append(pattern)
            
            # Sort by frequency and success rate
            patterns.sort(
                key=lambda p: (p.frequency * p.success_rate),
                reverse=True
            )
            
            logger.info(f"Detected {len(patterns)} workflow patterns")
            return patterns
            
        except Exception as e:
            logger.error(f"Error detecting workflow patterns: {e}")
            return []
    
    async def calculate_success_rate(
        self,
        workflow: Dict[str, Any]
    ) -> float:
        """
        Calculate success rate for a workflow.
        
        Args:
            workflow: Workflow data
            
        Returns:
            Success rate (0-1)
        """
        try:
            # Get workflow ID or name
            workflow_id = workflow.get('id')
            workflow_name = workflow.get('name')
            
            # Query historical executions
            query = """
                SELECT success_rate, execution_count
                FROM procedural_patterns
                WHERE id = $1 OR workflow_name = $2
                ORDER BY created_at DESC
                LIMIT 10
            """
            
            rows = await self.db.fetch(
                query,
                uuid.UUID(workflow_id) if workflow_id else None,
                workflow_name
            )
            
            if not rows:
                return 0.0
            
            # Calculate weighted average success rate
            total_weight = 0
            weighted_sum = 0
            
            for i, row in enumerate(rows):
                # Recent executions have higher weight
                weight = 1.0 / (i + 1)
                weighted_sum += float(row['success_rate']) * weight * int(row['execution_count'])
                total_weight += weight * int(row['execution_count'])
            
            success_rate = weighted_sum / total_weight if total_weight > 0 else 0.0
            
            logger.debug(f"Calculated success rate: {success_rate:.2f}")
            return success_rate
            
        except Exception as e:
            logger.error(f"Error calculating success rate: {e}")
            return 0.0
    
    async def generate_automation_suggestions(
        self,
        patterns: List[WorkflowPattern]
    ) -> List[Dict[str, Any]]:
        """
        Generate suggestions for workflow automation.
        
        Args:
            patterns: List of workflow patterns
            
        Returns:
            List of automation suggestions
        """
        try:
            suggestions = []
            
            for pattern in patterns:
                # Check if pattern is frequent and successful
                if (pattern.frequency >= self.min_pattern_frequency and
                    pattern.success_rate >= self.success_threshold):
                    
                    # Analyze for automation potential
                    automation_score = self._calculate_automation_potential(pattern)
                    
                    if automation_score > 0.6:
                        suggestion = {
                            "pattern_id": pattern.pattern_id,
                            "workflow_name": pattern.name,
                            "automation_score": automation_score,
                            "steps_to_automate": self._identify_automatable_steps(pattern),
                            "expected_time_saving": self._estimate_time_saving(pattern),
                            "implementation_complexity": self._assess_complexity(pattern),
                            "priority": self._calculate_priority(
                                automation_score,
                                pattern.frequency,
                                pattern.success_rate
                            )
                        }
                        suggestions.append(suggestion)
            
            # Sort by priority
            suggestions.sort(key=lambda s: s['priority'], reverse=True)
            
            logger.info(f"Generated {len(suggestions)} automation suggestions")
            return suggestions[:10]  # Return top 10 suggestions
            
        except Exception as e:
            logger.error(f"Error generating automation suggestions: {e}")
            return []
    
    async def optimize_workflow_path(
        self,
        current_state: WorkflowState,
        goal: WorkflowState
    ) -> List[Dict[str, Any]]:
        """
        Find optimal path from current state to goal using A* algorithm.
        
        Args:
            current_state: Current workflow state
            goal: Target workflow state
            
        Returns:
            Optimal sequence of actions
        """
        try:
            # Build state transition graph from historical data
            transition_graph = await self._build_transition_graph()
            
            # A* pathfinding
            path = self._astar_search(
                transition_graph,
                current_state,
                goal
            )
            
            if not path:
                logger.warning(f"No path found from {current_state} to {goal}")
                return []
            
            # Convert path to actionable steps
            optimized_steps = []
            for i in range(len(path) - 1):
                from_state = path[i]
                to_state = path[i + 1]
                
                # Get best action for this transition
                best_action = await self._get_best_action(
                    from_state,
                    to_state,
                    transition_graph
                )
                
                optimized_steps.append({
                    "step": i + 1,
                    "from_state": from_state.value,
                    "to_state": to_state.value,
                    "action": best_action['action'],
                    "expected_duration": best_action['duration'],
                    "success_probability": best_action['success_rate'],
                    "tips": best_action['tips']
                })
            
            logger.debug(f"Optimized path with {len(optimized_steps)} steps")
            return optimized_steps
            
        except Exception as e:
            logger.error(f"Error optimizing workflow path: {e}")
            return []
    
    async def learn_best_practices(
        self,
        successful_outcomes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Learn best practices from successful outcomes.
        
        Args:
            successful_outcomes: List of successful workflow outcomes
            
        Returns:
            Best practices analysis
        """
        try:
            best_practices = {
                "common_patterns": [],
                "optimal_sequences": [],
                "time_savers": [],
                "success_factors": [],
                "avoid_patterns": []
            }
            
            # Analyze successful workflows
            successful_sequences = []
            failed_sequences = []
            
            for outcome in successful_outcomes:
                if outcome.get('success', False):
                    successful_sequences.append(outcome.get('sequence', []))
                else:
                    failed_sequences.append(outcome.get('sequence', []))
            
            # Find common patterns in successful workflows
            if successful_sequences:
                common = self._find_common_subsequences(successful_sequences)
                best_practices['common_patterns'] = common[:5]
            
            # Identify optimal sequences
            optimal = self._identify_optimal_sequences(successful_sequences)
            best_practices['optimal_sequences'] = optimal[:3]
            
            # Find time-saving techniques
            time_savers = self._identify_time_savers(successful_sequences)
            best_practices['time_savers'] = time_savers[:5]
            
            # Extract success factors
            success_factors = self._extract_success_factors(successful_outcomes)
            best_practices['success_factors'] = success_factors[:5]
            
            # Identify patterns to avoid
            if failed_sequences:
                avoid = self._find_common_subsequences(failed_sequences)
                best_practices['avoid_patterns'] = avoid[:3]
            
            # Store learned practices
            await self._store_best_practices(best_practices)
            
            logger.info("Learned best practices from successful outcomes")
            return best_practices
            
        except Exception as e:
            logger.error(f"Error learning best practices: {e}")
            return {}
    
    def _generate_workflow_name(self, actions: List[Dict[str, Any]]) -> str:
        """Generate descriptive name for workflow."""
        if not actions:
            return "empty_workflow"
        
        # Use first and last action types
        first = actions[0].get('type', 'unknown')
        last = actions[-1].get('type', 'unknown')
        
        return f"{first}_to_{last}_workflow"
    
    async def _update_pattern_library(
        self,
        user_id: str,
        actions: List[Dict[str, Any]]
    ):
        """Update the pattern library with new sequence."""
        try:
            # Convert actions to pattern key
            pattern_key = self._actions_to_pattern_key(actions)
            
            # Check if pattern exists
            query = """
                SELECT id, execution_count, success_rate
                FROM procedural_patterns
                WHERE user_id = $1 AND workflow_name = $2
                LIMIT 1
            """
            
            row = await self.db.fetchrow(
                query,
                uuid.UUID(user_id) if user_id else None,
                pattern_key
            )
            
            if row:
                # Update existing pattern
                new_count = row['execution_count'] + 1
                success_rate = self._calculate_new_success_rate(
                    row['success_rate'],
                    row['execution_count'],
                    actions
                )
                
                update_query = """
                    UPDATE procedural_patterns
                    SET execution_count = $1,
                        success_rate = $2
                    WHERE id = $3
                """
                
                await self.db.execute(
                    update_query,
                    new_count,
                    success_rate,
                    row['id']
                )
            
        except Exception as e:
            logger.error(f"Error updating pattern library: {e}")
    
    def _mine_sequential_patterns(
        self,
        sequences: List[List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """Mine sequential patterns using PrefixSpan-like algorithm."""
        patterns = []
        
        # Count frequency of subsequences
        subsequence_counts = defaultdict(int)
        subsequence_durations = defaultdict(list)
        subsequence_success = defaultdict(list)
        
        for sequence in sequences:
            # Extract all subsequences of length 2-5
            for length in range(2, min(6, len(sequence) + 1)):
                for i in range(len(sequence) - length + 1):
                    subseq = tuple(
                        action.get('type', 'unknown')
                        for action in sequence[i:i+length]
                    )
                    subsequence_counts[subseq] += 1
                    
                    # Track metrics
                    duration = sum(
                        action.get('duration', 0)
                        for action in sequence[i:i+length]
                    )
                    subsequence_durations[subseq].append(duration)
                    
                    success = all(
                        action.get('success', True)
                        for action in sequence[i:i+length]
                    )
                    subsequence_success[subseq].append(success)
        
        # Filter frequent patterns
        for subseq, count in subsequence_counts.items():
            if count >= self.min_pattern_frequency:
                avg_duration = np.mean(subsequence_durations[subseq])
                success_rate = np.mean(subsequence_success[subseq])
                
                # Calculate optimization potential
                min_duration = min(subsequence_durations[subseq])
                optimization_potential = (avg_duration - min_duration) / avg_duration
                
                patterns.append({
                    "name": "_".join(subseq),
                    "sequence": list(subseq),
                    "frequency": count,
                    "success_rate": success_rate,
                    "avg_duration": avg_duration,
                    "optimization_potential": optimization_potential
                })
        
        return patterns
    
    def _calculate_automation_potential(
        self,
        pattern: WorkflowPattern
    ) -> float:
        """Calculate potential for automating a pattern."""
        score = 0.0
        
        # High frequency increases automation value
        if pattern.frequency > 10:
            score += 0.3
        elif pattern.frequency > 5:
            score += 0.2
        
        # High success rate makes automation safer
        if pattern.success_rate > 0.9:
            score += 0.3
        elif pattern.success_rate > 0.8:
            score += 0.2
        
        # Repetitive actions are good candidates
        action_types = [a.action_type for a in pattern.action_sequence]
        unique_ratio = len(set(action_types)) / len(action_types)
        if unique_ratio < 0.5:
            score += 0.2
        
        # Long sequences benefit more from automation
        if len(pattern.action_sequence) > 5:
            score += 0.2
        
        return min(1.0, score)
    
    def _identify_automatable_steps(
        self,
        pattern: WorkflowPattern
    ) -> List[str]:
        """Identify which steps can be automated."""
        automatable = []
        
        automatable_types = [
            ActionType.SEARCH,
            ActionType.FILTER,
            ActionType.SCHEDULE,
            ActionType.APPROVE
        ]
        
        for i, action in enumerate(pattern.action_sequence):
            if action.action_type in automatable_types:
                automatable.append(f"Step {i+1}: {action.action_type.value}")
        
        return automatable
    
    def _estimate_time_saving(
        self,
        pattern: WorkflowPattern
    ) -> Dict[str, Any]:
        """Estimate time savings from automation."""
        total_duration = sum(
            a.duration_seconds for a in pattern.action_sequence
        )
        
        # Estimate 70% time reduction for automated steps
        automatable_duration = sum(
            a.duration_seconds for a in pattern.action_sequence
            if a.action_type in [ActionType.SEARCH, ActionType.FILTER, ActionType.SCHEDULE]
        )
        
        time_saved = automatable_duration * 0.7
        
        return {
            "current_duration_seconds": total_duration,
            "estimated_duration_seconds": total_duration - time_saved,
            "time_saved_seconds": time_saved,
            "percentage_reduction": (time_saved / total_duration * 100) if total_duration > 0 else 0
        }
    
    def _assess_complexity(
        self,
        pattern: WorkflowPattern
    ) -> str:
        """Assess implementation complexity."""
        unique_actions = len(set(a.action_type for a in pattern.action_sequence))
        
        if unique_actions <= 2:
            return "low"
        elif unique_actions <= 4:
            return "medium"
        else:
            return "high"
    
    def _calculate_priority(
        self,
        automation_score: float,
        frequency: int,
        success_rate: float
    ) -> float:
        """Calculate priority for automation."""
        # Weighted combination
        priority = (
            automation_score * 0.4 +
            min(frequency / 20, 1.0) * 0.3 +
            success_rate * 0.3
        )
        return priority
    
    async def _build_transition_graph(self) -> Dict[str, Any]:
        """Build state transition graph from historical data."""
        graph = defaultdict(list)
        
        # Query historical transitions
        query = """
            SELECT action_sequence
            FROM procedural_patterns
            WHERE success_rate > $1
            LIMIT 1000
        """
        
        rows = await self.db.fetch(query, 0.5)
        
        for row in rows:
            sequence = json.loads(row['action_sequence'])
            
            for action in sequence:
                from_state = WorkflowState(action.get('state_from', 'initial'))
                to_state = WorkflowState(action.get('state_to', 'completed'))
                duration = action.get('duration', 60)
                
                graph[from_state].append({
                    'to': to_state,
                    'cost': duration,
                    'action': action.get('type'),
                    'success_rate': action.get('success', 1.0)
                })
        
        return dict(graph)
    
    def _astar_search(
        self,
        graph: Dict[str, Any],
        start: WorkflowState,
        goal: WorkflowState
    ) -> List[WorkflowState]:
        """A* pathfinding for optimal workflow path."""
        # Priority queue: (f_score, current_state, path)
        frontier = [(0, start, [start])]
        visited = set()
        
        while frontier:
            f_score, current, path = heapq.heappop(frontier)
            
            if current == goal:
                return path
            
            if current in visited:
                continue
            
            visited.add(current)
            
            # Explore neighbors
            for edge in graph.get(current, []):
                next_state = edge['to']
                if next_state not in visited:
                    g_score = f_score + edge['cost']
                    h_score = self._heuristic(next_state, goal)
                    f_score_new = g_score + h_score
                    
                    heapq.heappush(
                        frontier,
                        (f_score_new, next_state, path + [next_state])
                    )
        
        return []  # No path found
    
    def _heuristic(
        self,
        state: WorkflowState,
        goal: WorkflowState
    ) -> float:
        """Heuristic function for A* search."""
        # Simple heuristic based on workflow stages
        state_order = list(WorkflowState)
        
        try:
            current_idx = state_order.index(state)
            goal_idx = state_order.index(goal)
            # Estimate remaining steps * average step time (60 seconds)
            return abs(goal_idx - current_idx) * 60
        except ValueError:
            return 0
    
    async def _get_best_action(
        self,
        from_state: WorkflowState,
        to_state: WorkflowState,
        graph: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get best action for state transition."""
        edges = graph.get(from_state, [])
        
        for edge in edges:
            if edge['to'] == to_state:
                # Get tips from successful executions
                tips = await self._get_action_tips(from_state, to_state)
                
                return {
                    'action': edge.get('action', 'transition'),
                    'duration': edge.get('cost', 60),
                    'success_rate': edge.get('success_rate', 0.8),
                    'tips': tips
                }
        
        # Default action if not found
        return {
            'action': 'transition',
            'duration': 60,
            'success_rate': 0.5,
            'tips': []
        }
    
    async def _get_action_tips(
        self,
        from_state: WorkflowState,
        to_state: WorkflowState
    ) -> List[str]:
        """Get tips for performing an action."""
        tips = []
        
        # Add specific tips based on transition
        if from_state == WorkflowState.TALENT_SEARCH and to_state == WorkflowState.SHORTLISTING:
            tips.append("Use multiple search criteria for comprehensive results")
            tips.append("Consider both primary and secondary skill requirements")
        elif from_state == WorkflowState.SHORTLISTING and to_state == WorkflowState.AUDITION_SCHEDULING:
            tips.append("Check talent availability before scheduling")
            tips.append("Group auditions by role for efficiency")
        elif from_state == WorkflowState.AUDITION_REVIEW and to_state == WorkflowState.DIRECTOR_REVIEW:
            tips.append("Prepare comprehensive notes for director")
            tips.append("Include chemistry test results if available")
        
        return tips
    
    def _actions_to_pattern_key(self, actions: List[Dict[str, Any]]) -> str:
        """Convert action sequence to pattern key."""
        action_types = [a.get('type', 'unknown') for a in actions]
        return "_".join(action_types)
    
    def _calculate_new_success_rate(
        self,
        old_rate: float,
        old_count: int,
        new_actions: List[Dict[str, Any]]
    ) -> float:
        """Calculate updated success rate."""
        new_success = sum(1 for a in new_actions if a.get('success', True))
        new_rate = new_success / len(new_actions) if new_actions else 0
        
        # Weighted average
        total = old_rate * old_count + new_rate
        return total / (old_count + 1)
    
    def _find_common_subsequences(
        self,
        sequences: List[List[Any]]
    ) -> List[Dict[str, Any]]:
        """Find common subsequences in sequences."""
        if not sequences:
            return []
        
        # Count subsequences
        subseq_counts = Counter()
        
        for sequence in sequences:
            # Generate subsequences of length 2-4
            for length in range(2, min(5, len(sequence) + 1)):
                for i in range(len(sequence) - length + 1):
                    subseq = tuple(
                        item.get('type', 'unknown') if isinstance(item, dict) else str(item)
                        for item in sequence[i:i+length]
                    )
                    subseq_counts[subseq] += 1
        
        # Sort by frequency
        common = []
        for subseq, count in subseq_counts.most_common(10):
            if count >= 2:  # At least 2 occurrences
                common.append({
                    "pattern": list(subseq),
                    "frequency": count,
                    "percentage": count / len(sequences) * 100
                })
        
        return common
    
    def _identify_optimal_sequences(
        self,
        sequences: List[List[Any]]
    ) -> List[Dict[str, Any]]:
        """Identify optimal workflow sequences."""
        optimal = []
        
        # Group by length and find fastest
        length_groups = defaultdict(list)
        
        for sequence in sequences:
            total_duration = sum(
                item.get('duration', 0) if isinstance(item, dict) else 60
                for item in sequence
            )
            length_groups[len(sequence)].append({
                'sequence': sequence,
                'duration': total_duration
            })
        
        # Find optimal for each length
        for length, group in length_groups.items():
            if group:
                fastest = min(group, key=lambda x: x['duration'])
                optimal.append({
                    'length': length,
                    'duration': fastest['duration'],
                    'sequence_preview': fastest['sequence'][:3]  # First 3 steps
                })
        
        return sorted(optimal, key=lambda x: x['duration'])
    
    def _identify_time_savers(
        self,
        sequences: List[List[Any]]
    ) -> List[Dict[str, Any]]:
        """Identify time-saving techniques."""
        time_savers = []
        
        # Analyze parallel vs sequential execution
        for sequence in sequences:
            parallel_opportunities = self._find_parallel_opportunities(sequence)
            if parallel_opportunities:
                time_saved = sum(opp['time_saved'] for opp in parallel_opportunities)
                time_savers.append({
                    'technique': 'parallel_execution',
                    'applicable_steps': len(parallel_opportunities),
                    'estimated_time_saved': time_saved
                })
        
        # Analyze skip opportunities
        skip_patterns = self._find_skippable_steps(sequences)
        for pattern in skip_patterns:
            time_savers.append({
                'technique': 'conditional_skip',
                'step': pattern['step'],
                'condition': pattern['condition'],
                'estimated_time_saved': pattern['time_saved']
            })
        
        return time_savers
    
    def _find_parallel_opportunities(
        self,
        sequence: List[Any]
    ) -> List[Dict[str, Any]]:
        """Find opportunities for parallel execution."""
        opportunities = []
        
        for i in range(len(sequence) - 1):
            current = sequence[i]
            next_item = sequence[i + 1]
            
            # Check if actions can be parallelized
            if isinstance(current, dict) and isinstance(next_item, dict):
                if self._can_parallelize(current, next_item):
                    time_saved = min(
                        current.get('duration', 0),
                        next_item.get('duration', 0)
                    )
                    opportunities.append({
                        'steps': [i, i+1],
                        'time_saved': time_saved
                    })
        
        return opportunities
    
    def _can_parallelize(self, action1: Dict, action2: Dict) -> bool:
        """Check if two actions can be executed in parallel."""
        # Actions that typically can be parallelized
        parallelizable_pairs = [
            (ActionType.SEARCH, ActionType.SEARCH),
            (ActionType.FILTER, ActionType.FILTER),
            (ActionType.REVIEW, ActionType.REVIEW)
        ]
        
        type1 = ActionType(action1.get('type', 'unknown'))
        type2 = ActionType(action2.get('type', 'unknown'))
        
        return (type1, type2) in parallelizable_pairs
    
    def _find_skippable_steps(
        self,
        sequences: List[List[Any]]
    ) -> List[Dict[str, Any]]:
        """Find steps that can be conditionally skipped."""
        skippable = []
        
        # Analyze sequences for optional steps
        step_necessity = defaultdict(int)
        step_occurrences = defaultdict(int)
        
        for sequence in sequences:
            seen_steps = set()
            for item in sequence:
                if isinstance(item, dict):
                    step_type = item.get('type', 'unknown')
                    step_occurrences[step_type] += 1
                    if step_type not in seen_steps:
                        step_necessity[step_type] += 1
                        seen_steps.add(step_type)
        
        # Find steps that don't always occur
        for step, necessity_count in step_necessity.items():
            occurrence_rate = necessity_count / len(sequences)
            if 0.3 < occurrence_rate < 0.7:  # Sometimes skipped
                skippable.append({
                    'step': step,
                    'condition': f"When {100 * (1 - occurrence_rate):.0f}% confidence in decision",
                    'time_saved': 60  # Estimated
                })
        
        return skippable
    
    def _extract_success_factors(
        self,
        outcomes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract factors that contribute to success."""
        factors = []
        
        successful = [o for o in outcomes if o.get('success', False)]
        failed = [o for o in outcomes if not o.get('success', False)]
        
        if successful and failed:
            # Compare successful vs failed characteristics
            success_chars = self._extract_characteristics(successful)
            fail_chars = self._extract_characteristics(failed)
            
            # Find significant differences
            for char, success_avg in success_chars.items():
                fail_avg = fail_chars.get(char, 0)
                if success_avg > fail_avg * 1.5:  # 50% better in successful
                    factors.append({
                        'factor': char,
                        'impact': 'positive',
                        'success_rate_with': success_avg,
                        'success_rate_without': fail_avg
                    })
        
        return factors
    
    def _extract_characteristics(
        self,
        outcomes: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Extract characteristics from outcomes."""
        chars = defaultdict(list)
        
        for outcome in outcomes:
            # Extract various metrics
            if 'sequence' in outcome:
                chars['sequence_length'].append(len(outcome['sequence']))
                chars['unique_actions'].append(
                    len(set(a.get('type') for a in outcome['sequence'] if isinstance(a, dict)))
                )
            
            if 'duration' in outcome:
                chars['total_duration'].append(outcome['duration'])
            
            if 'team_size' in outcome:
                chars['team_size'].append(outcome['team_size'])
        
        # Calculate averages
        return {
            char: np.mean(values) if values else 0
            for char, values in chars.items()
        }
    
    async def _store_best_practices(self, practices: Dict[str, Any]):
        """Store learned best practices."""
        try:
            # Store as a special pattern
            query = """
                INSERT INTO procedural_patterns (
                    id, user_id, workflow_name, action_sequence,
                    success_rate, execution_count, average_time_seconds,
                    optimization_suggestions, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """
            
            await self.db.execute(
                query,
                uuid.uuid4(),
                None,  # System-level pattern
                "best_practices",
                json.dumps(practices),
                1.0,  # Perfect success rate for best practices
                0,  # Not an execution
                0,  # No duration
                json.dumps(practices.get('time_savers', [])),
                datetime.utcnow()
            )
            
            logger.debug("Stored best practices")
            
        except Exception as e:
            logger.error(f"Error storing best practices: {e}")
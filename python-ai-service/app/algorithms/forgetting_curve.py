"""Ebbinghaus Forgetting Curve Implementation for Memory System."""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from loguru import logger
import math


class MemoryStrength(Enum):
    """Memory strength levels."""
    VERY_STRONG = 0.9
    STRONG = 0.7
    MODERATE = 0.5
    WEAK = 0.3
    VERY_WEAK = 0.1


class SpacingInterval(Enum):
    """Optimal spacing intervals for repetition."""
    INITIAL = 1  # 1 day
    FIRST_REVIEW = 3  # 3 days
    SECOND_REVIEW = 7  # 1 week
    THIRD_REVIEW = 21  # 3 weeks
    FOURTH_REVIEW = 60  # 2 months
    LONG_TERM = 180  # 6 months


@dataclass
class MemoryTrace:
    """Individual memory trace with retention data."""
    memory_id: str
    initial_strength: float
    current_strength: float
    creation_time: datetime
    last_access_time: datetime
    access_count: int
    importance_factor: float
    emotional_weight: float
    context_richness: float


class EbbinghausForgettingCurve:
    """
    Implementation of Ebbinghaus Forgetting Curve with enhancements
    for spaced repetition and contextual factors.
    """
    
    def __init__(self):
        # Standard forgetting curve parameters
        self.k = 0.5  # Forgetting rate constant
        self.c = 1.25  # Initial memory strength multiplier
        
        # Enhanced parameters
        self.importance_weight = 0.3
        self.emotion_weight = 0.2
        self.context_weight = 0.15
        self.repetition_weight = 0.35
        
        # Spacing effect parameters
        self.spacing_bonus = 0.15  # Bonus for optimal spacing
        self.massing_penalty = 0.1  # Penalty for massed practice
        
    def calculate_retention(
        self,
        time_elapsed: timedelta,
        initial_strength: float = 1.0,
        repetitions: int = 0,
        importance: float = 0.5,
        emotional_valence: float = 0.5,
        context_richness: float = 0.5
    ) -> float:
        """
        Calculate memory retention using enhanced Ebbinghaus formula.
        
        Args:
            time_elapsed: Time since last access
            initial_strength: Initial memory strength (0-1)
            repetitions: Number of times memory was reinforced
            importance: Importance factor (0-1)
            emotional_valence: Emotional significance (0-1)
            context_richness: Amount of contextual information (0-1)
            
        Returns:
            Current retention strength (0-1)
        """
        try:
            # Convert time to hours for calculation
            hours_elapsed = time_elapsed.total_seconds() / 3600
            
            # Base Ebbinghaus formula: R = e^(-t/s)
            # where s is stability factor influenced by various parameters
            
            # Calculate stability factor
            stability = self._calculate_stability(
                repetitions,
                importance,
                emotional_valence,
                context_richness
            )
            
            # Apply forgetting curve
            base_retention = initial_strength * np.exp(-self.k * hours_elapsed / stability)
            
            # Apply modifiers
            retention = self._apply_modifiers(
                base_retention,
                repetitions,
                importance,
                emotional_valence,
                context_richness
            )
            
            # Ensure within bounds [0, 1]
            return max(0.0, min(1.0, retention))
            
        except Exception as e:
            logger.error(f"Error calculating retention: {e}")
            return 0.5  # Default moderate retention
    
    def _calculate_stability(
        self,
        repetitions: int,
        importance: float,
        emotional_valence: float,
        context_richness: float
    ) -> float:
        """Calculate memory stability factor."""
        # Base stability
        base_stability = 1.0
        
        # Repetition effect (increases stability)
        repetition_factor = 1 + (repetitions * 0.5)
        
        # Importance effect
        importance_factor = 1 + (importance * self.importance_weight)
        
        # Emotional effect (stronger emotions = better retention)
        emotion_factor = 1 + (abs(emotional_valence - 0.5) * 2 * self.emotion_weight)
        
        # Context effect
        context_factor = 1 + (context_richness * self.context_weight)
        
        # Combined stability
        stability = base_stability * repetition_factor * importance_factor * emotion_factor * context_factor
        
        return max(1.0, stability)  # Minimum stability of 1
    
    def _apply_modifiers(
        self,
        base_retention: float,
        repetitions: int,
        importance: float,
        emotional_valence: float,
        context_richness: float
    ) -> float:
        """Apply additional modifiers to retention."""
        retention = base_retention
        
        # Primacy and recency effects
        if repetitions == 0:
            # New memories have primacy boost
            retention *= 1.1
        elif repetitions > 5:
            # Well-rehearsed memories resist forgetting
            retention *= (1 + 0.05 * min(repetitions - 5, 10))
        
        # Emotional enhancement
        if emotional_valence > 0.7 or emotional_valence < 0.3:
            # Strong emotions enhance retention
            retention *= 1.15
        
        # Importance boost
        if importance > 0.8:
            # Critical memories get retention boost
            retention *= 1.2
        
        # Context richness bonus
        if context_richness > 0.7:
            # Rich context improves retention
            retention *= 1.1
        
        return retention
    
    def calculate_optimal_review_time(
        self,
        current_strength: float,
        target_strength: float,
        repetitions: int,
        importance: float = 0.5
    ) -> timedelta:
        """
        Calculate optimal time for next review to maintain target strength.
        
        Args:
            current_strength: Current memory strength
            target_strength: Desired minimum strength
            repetitions: Number of previous reviews
            importance: Memory importance
            
        Returns:
            Optimal time until next review
        """
        try:
            if current_strength <= target_strength:
                # Immediate review needed
                return timedelta(hours=0)
            
            # Calculate stability with current parameters
            stability = self._calculate_stability(
                repetitions,
                importance,
                0.5,  # Neutral emotion
                0.5   # Average context
            )
            
            # Solve for time: t = -s * ln(R_target/R_current) / k
            time_hours = -stability * np.log(target_strength / current_strength) / self.k
            
            # Apply spacing intervals
            optimal_interval = self._get_spacing_interval(repetitions)
            
            # Blend calculated time with optimal spacing
            final_hours = 0.7 * time_hours + 0.3 * optimal_interval * 24
            
            return timedelta(hours=max(1, final_hours))
            
        except Exception as e:
            logger.error(f"Error calculating optimal review time: {e}")
            return timedelta(days=1)  # Default to 1 day
    
    def _get_spacing_interval(self, repetitions: int) -> int:
        """Get optimal spacing interval in days based on repetition count."""
        if repetitions == 0:
            return SpacingInterval.INITIAL.value
        elif repetitions == 1:
            return SpacingInterval.FIRST_REVIEW.value
        elif repetitions == 2:
            return SpacingInterval.SECOND_REVIEW.value
        elif repetitions == 3:
            return SpacingInterval.THIRD_REVIEW.value
        elif repetitions == 4:
            return SpacingInterval.FOURTH_REVIEW.value
        else:
            return SpacingInterval.LONG_TERM.value
    
    def apply_spacing_effect(
        self,
        reviews: List[datetime],
        current_time: datetime
    ) -> float:
        """
        Calculate spacing effect modifier based on review history.
        
        Args:
            reviews: List of review timestamps
            current_time: Current timestamp
            
        Returns:
            Spacing effect modifier (0.5 to 1.5)
        """
        if len(reviews) < 2:
            return 1.0  # No spacing effect yet
        
        # Calculate inter-review intervals
        intervals = []
        for i in range(1, len(reviews)):
            interval = (reviews[i] - reviews[i-1]).total_seconds() / 3600
            intervals.append(interval)
        
        # Check for optimal spacing
        optimal_intervals = [
            SpacingInterval.INITIAL.value * 24,
            SpacingInterval.FIRST_REVIEW.value * 24,
            SpacingInterval.SECOND_REVIEW.value * 24,
            SpacingInterval.THIRD_REVIEW.value * 24
        ]
        
        # Calculate spacing quality
        spacing_quality = 0
        for i, interval in enumerate(intervals[:4]):
            if i < len(optimal_intervals):
                optimal = optimal_intervals[i]
                # Calculate how close to optimal
                deviation = abs(interval - optimal) / optimal
                if deviation < 0.3:  # Within 30% of optimal
                    spacing_quality += 1
                elif deviation > 1.0:  # Far from optimal
                    spacing_quality -= 0.5
        
        # Convert to modifier
        if spacing_quality > 2:
            return 1.0 + self.spacing_bonus
        elif spacing_quality < 0:
            return 1.0 - self.massing_penalty
        else:
            return 1.0
    
    def predict_retention_over_time(
        self,
        initial_strength: float,
        time_points: List[int],
        repetitions: int = 0,
        importance: float = 0.5
    ) -> List[Tuple[int, float]]:
        """
        Predict retention strength over multiple time points.
        
        Args:
            initial_strength: Starting memory strength
            time_points: List of hours to predict
            repetitions: Number of reinforcements
            importance: Memory importance
            
        Returns:
            List of (hours, retention_strength) tuples
        """
        predictions = []
        
        for hours in time_points:
            retention = self.calculate_retention(
                timedelta(hours=hours),
                initial_strength,
                repetitions,
                importance,
                0.5,  # Neutral emotion
                0.5   # Average context
            )
            predictions.append((hours, retention))
        
        return predictions
    
    def calculate_forgetting_rate(
        self,
        memory_trace: MemoryTrace
    ) -> float:
        """
        Calculate the forgetting rate for a specific memory.
        
        Args:
            memory_trace: Memory trace data
            
        Returns:
            Forgetting rate (higher = faster forgetting)
        """
        # Calculate time since last access
        time_elapsed = datetime.utcnow() - memory_trace.last_access_time
        
        # Calculate current retention
        current_retention = self.calculate_retention(
            time_elapsed,
            memory_trace.initial_strength,
            memory_trace.access_count,
            memory_trace.importance_factor,
            memory_trace.emotional_weight,
            memory_trace.context_richness
        )
        
        # Calculate rate of change
        if time_elapsed.total_seconds() > 0:
            hours = time_elapsed.total_seconds() / 3600
            forgetting_rate = (memory_trace.initial_strength - current_retention) / hours
        else:
            forgetting_rate = 0
        
        return max(0, forgetting_rate)
    
    def estimate_learning_efficiency(
        self,
        review_history: List[Dict[str, Any]]
    ) -> float:
        """
        Estimate learning efficiency based on review patterns.
        
        Args:
            review_history: History of reviews with timestamps and results
            
        Returns:
            Learning efficiency score (0-1)
        """
        if not review_history:
            return 0.5  # Default medium efficiency
        
        efficiency_scores = []
        
        for i, review in enumerate(review_history):
            # Check spacing quality
            if i > 0:
                interval = (review['timestamp'] - review_history[i-1]['timestamp']).total_seconds() / 3600
                optimal = self._get_spacing_interval(i) * 24
                
                # Calculate efficiency based on spacing
                deviation = abs(interval - optimal) / optimal
                spacing_efficiency = max(0, 1 - deviation)
                
                # Factor in success rate
                success_rate = review.get('success_rate', 0.5)
                
                # Combined efficiency
                efficiency = 0.6 * spacing_efficiency + 0.4 * success_rate
                efficiency_scores.append(efficiency)
        
        return np.mean(efficiency_scores) if efficiency_scores else 0.5
    
    def recommend_consolidation_strategy(
        self,
        memory_traces: List[MemoryTrace]
    ) -> Dict[str, Any]:
        """
        Recommend consolidation strategy based on forgetting curves.
        
        Args:
            memory_traces: List of memory traces
            
        Returns:
            Consolidation recommendations
        """
        recommendations = {
            "immediate_review": [],
            "scheduled_review": [],
            "can_forget": [],
            "consolidate_now": []
        }
        
        for trace in memory_traces:
            time_elapsed = datetime.utcnow() - trace.last_access_time
            
            # Calculate current retention
            retention = self.calculate_retention(
                time_elapsed,
                trace.initial_strength,
                trace.access_count,
                trace.importance_factor,
                trace.emotional_weight,
                trace.context_richness
            )
            
            # Categorize based on retention and importance
            if retention < 0.3 and trace.importance_factor > 0.7:
                # Critical memory at risk
                recommendations["immediate_review"].append({
                    "memory_id": trace.memory_id,
                    "retention": retention,
                    "importance": trace.importance_factor
                })
            elif retention < 0.5 and trace.importance_factor > 0.5:
                # Important memory needing review
                optimal_time = self.calculate_optimal_review_time(
                    retention,
                    0.7,  # Target strength
                    trace.access_count,
                    trace.importance_factor
                )
                recommendations["scheduled_review"].append({
                    "memory_id": trace.memory_id,
                    "retention": retention,
                    "review_in": optimal_time
                })
            elif retention > 0.8:
                # Strong memory for consolidation
                recommendations["consolidate_now"].append({
                    "memory_id": trace.memory_id,
                    "retention": retention,
                    "stability": self._calculate_stability(
                        trace.access_count,
                        trace.importance_factor,
                        trace.emotional_weight,
                        trace.context_richness
                    )
                })
            elif trace.importance_factor < 0.3 and retention < 0.4:
                # Low importance, low retention - can forget
                recommendations["can_forget"].append({
                    "memory_id": trace.memory_id,
                    "retention": retention,
                    "importance": trace.importance_factor
                })
        
        return recommendations
    
    def calculate_memory_load(
        self,
        memory_traces: List[MemoryTrace],
        threshold: float = 0.3
    ) -> Dict[str, Any]:
        """
        Calculate cognitive memory load based on active memories.
        
        Args:
            memory_traces: List of memory traces
            threshold: Minimum retention threshold
            
        Returns:
            Memory load metrics
        """
        active_memories = 0
        total_strength = 0
        weak_memories = 0
        strong_memories = 0
        
        for trace in memory_traces:
            time_elapsed = datetime.utcnow() - trace.last_access_time
            
            retention = self.calculate_retention(
                time_elapsed,
                trace.initial_strength,
                trace.access_count,
                trace.importance_factor,
                trace.emotional_weight,
                trace.context_richness
            )
            
            if retention > threshold:
                active_memories += 1
                total_strength += retention
                
                if retention > 0.7:
                    strong_memories += 1
                elif retention < 0.5:
                    weak_memories += 1
        
        # Calculate load metrics
        cognitive_load = min(1.0, active_memories / 150)  # Dunbar's number approximation
        average_strength = total_strength / active_memories if active_memories > 0 else 0
        
        return {
            "active_memories": active_memories,
            "cognitive_load": cognitive_load,
            "average_strength": average_strength,
            "strong_memories": strong_memories,
            "weak_memories": weak_memories,
            "load_status": self._get_load_status(cognitive_load)
        }
    
    def _get_load_status(self, load: float) -> str:
        """Get human-readable load status."""
        if load < 0.3:
            return "low"
        elif load < 0.6:
            return "moderate"
        elif load < 0.8:
            return "high"
        else:
            return "overloaded"
    
    def simulate_forgetting_curve(
        self,
        days: int = 30,
        initial_strength: float = 1.0,
        review_schedule: Optional[List[int]] = None
    ) -> List[Tuple[float, float]]:
        """
        Simulate forgetting curve over time with optional reviews.
        
        Args:
            days: Number of days to simulate
            initial_strength: Starting memory strength
            review_schedule: Optional list of review days
            
        Returns:
            List of (day, retention) tuples
        """
        curve = []
        current_strength = initial_strength
        repetitions = 0
        
        for day in range(days + 1):
            # Check if review scheduled
            if review_schedule and day in review_schedule:
                # Review boosts strength
                current_strength = min(1.0, current_strength + 0.3)
                repetitions += 1
            
            # Calculate retention
            retention = self.calculate_retention(
                timedelta(days=day),
                current_strength,
                repetitions,
                0.5,  # Average importance
                0.5,  # Neutral emotion
                0.5   # Average context
            )
            
            curve.append((float(day), retention))
        
        return curve
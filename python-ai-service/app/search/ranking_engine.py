"""Advanced search ranking engine with ML-based scoring."""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
from datetime import datetime
from sklearn.preprocessing import MinMaxScaler
import json
from collections import defaultdict

from app.core.config import settings
from app.database.connection import async_db


class SearchRanking:
    """ML-powered ranking algorithm for search results."""
    
    def __init__(self):
        """Initialize ranking engine components."""
        # Feature weights learned from user feedback
        self.feature_weights = {
            "relevance": 0.35,
            "experience": 0.15,
            "popularity": 0.10,
            "recency": 0.10,
            "availability": 0.15,
            "chemistry": 0.10,
            "diversity": 0.05
        }
        
        # User preference learning
        self.user_preferences = defaultdict(lambda: defaultdict(float))
        
        # Scaler for feature normalization
        self.scaler = MinMaxScaler()
        
        # Chemistry matrix (talent compatibility scores)
        self.chemistry_matrix = {}
        
        # Performance cache
        self.performance_cache = {}
        self.cache_ttl = 3600  # 1 hour
    
    async def calculate_relevance_score(
        self,
        talent: Dict[str, Any],
        query: Dict[str, Any]
    ) -> float:
        """
        Calculate relevance score between talent and query.
        
        Args:
            talent: Talent profile data
            query: Search query parameters
            
        Returns:
            Relevance score (0-1)
        """
        try:
            scores = []
            
            # Semantic similarity score
            if "semantic_score" in talent:
                scores.append(talent["semantic_score"])
            
            # Skill match score
            skill_score = await self._calculate_skill_match(talent, query)
            scores.append(skill_score)
            
            # Genre match score
            genre_score = await self._calculate_genre_match(talent, query)
            scores.append(genre_score)
            
            # Language match score
            language_score = await self._calculate_language_match(talent, query)
            scores.append(language_score)
            
            # Physical attributes match
            physical_score = await self._calculate_physical_match(talent, query)
            scores.append(physical_score)
            
            # Calculate weighted average
            if scores:
                relevance = sum(scores) / len(scores)
            else:
                relevance = 0.0
            
            return min(1.0, max(0.0, relevance))
            
        except Exception as e:
            logger.error(f"Failed to calculate relevance score: {e}")
            return 0.0
    
    async def apply_user_preferences(
        self,
        results: List[Dict[str, Any]],
        user_id: str,
        user_history: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Apply personalized user preferences to ranking.
        
        Args:
            results: Search results
            user_id: User identifier
            user_history: User's interaction history
            
        Returns:
            Results adjusted for user preferences
        """
        try:
            # Load user preferences
            preferences = await self._load_user_preferences(user_id)
            
            # Analyze user history if provided
            if user_history:
                preferences = await self._update_preferences_from_history(
                    preferences,
                    user_history
                )
            
            # Apply preferences to results
            for result in results:
                preference_score = 0.0
                metadata = result.get("metadata", {})
                
                # Check preferred genres
                if "genres" in preferences and metadata.get("genres"):
                    talent_genres = set(metadata["genres"])
                    preferred_genres = set(preferences["genres"])
                    overlap = talent_genres.intersection(preferred_genres)
                    if preferred_genres:
                        preference_score += len(overlap) / len(preferred_genres) * 0.3
                
                # Check preferred age range
                if "age_preference" in preferences and metadata.get("age"):
                    age = metadata["age"]
                    age_pref = preferences["age_preference"]
                    if age_pref["min"] <= age <= age_pref["max"]:
                        preference_score += 0.2
                
                # Check preferred locations
                if "locations" in preferences and metadata.get("location"):
                    if metadata["location"] in preferences["locations"]:
                        preference_score += 0.2
                
                # Check interaction patterns
                if "liked_talents" in preferences:
                    if result["id"] in preferences["liked_talents"]:
                        preference_score += 0.3
                
                result["preference_score"] = preference_score
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to apply user preferences: {e}")
            return results
    
    async def boost_recent_successes(
        self,
        results: List[Dict[str, Any]],
        performance_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Boost talents with recent successful performances.
        
        Args:
            results: Search results
            performance_data: Recent performance metrics
            
        Returns:
            Results with performance boost applied
        """
        try:
            # Load performance data if not provided
            if not performance_data:
                talent_ids = [r["id"] for r in results]
                performance_data = await self._load_performance_data(talent_ids)
            
            for result in results:
                talent_id = result["id"]
                boost_score = 0.0
                
                if talent_id in performance_data:
                    perf = performance_data[talent_id]
                    
                    # Recent box office success
                    if "recent_box_office" in perf:
                        if perf["recent_box_office"] > 100_000_000:  # 100 crore+
                            boost_score += 0.3
                        elif perf["recent_box_office"] > 50_000_000:  # 50 crore+
                            boost_score += 0.2
                        else:
                            boost_score += 0.1
                    
                    # Awards and nominations
                    if "recent_awards" in perf:
                        boost_score += min(0.3, perf["recent_awards"] * 0.1)
                    
                    # Critical acclaim
                    if "average_rating" in perf:
                        boost_score += (perf["average_rating"] / 10) * 0.2
                    
                    # Trending status
                    if "is_trending" in perf and perf["is_trending"]:
                        boost_score += 0.2
                
                result["performance_boost"] = min(1.0, boost_score)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to boost recent successes: {e}")
            return results
    
    async def consider_chemistry_scores(
        self,
        results: List[Dict[str, Any]],
        with_cast: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Consider chemistry with existing cast members.
        
        Args:
            results: Search results
            with_cast: List of cast member IDs already selected
            
        Returns:
            Results with chemistry scores
        """
        try:
            if not with_cast:
                # No existing cast to consider
                for result in results:
                    result["chemistry_score"] = 0.5  # Neutral
                return results
            
            for result in results:
                talent_id = result["id"]
                chemistry_scores = []
                
                # Calculate chemistry with each cast member
                for cast_id in with_cast:
                    chemistry = await self._get_chemistry_score(talent_id, cast_id)
                    chemistry_scores.append(chemistry)
                
                # Average chemistry score
                if chemistry_scores:
                    result["chemistry_score"] = sum(chemistry_scores) / len(chemistry_scores)
                else:
                    result["chemistry_score"] = 0.5  # Neutral
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to calculate chemistry scores: {e}")
            return results
    
    async def apply_diversity_factors(
        self,
        results: List[Dict[str, Any]],
        current_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Apply diversity factors to promote inclusive casting.
        
        Args:
            results: Search results
            current_results: Already selected results
            
        Returns:
            Results with diversity scores
        """
        try:
            # Analyze current selection diversity
            diversity_profile = self._analyze_diversity(current_results)
            
            for result in results:
                diversity_score = 0.0
                metadata = result.get("metadata", {})
                
                # Gender diversity
                if "gender" in metadata:
                    gender = metadata["gender"]
                    if diversity_profile["gender"].get(gender, 0) < 0.4:
                        diversity_score += 0.3
                
                # Age diversity
                if "age" in metadata:
                    age_group = metadata["age"] // 10
                    if diversity_profile["age_groups"].get(age_group, 0) < 0.2:
                        diversity_score += 0.2
                
                # Geographic diversity
                if "location" in metadata:
                    location = metadata["location"]
                    if diversity_profile["locations"].get(location, 0) < 0.15:
                        diversity_score += 0.2
                
                # Language diversity
                if "languages" in metadata:
                    for language in metadata["languages"]:
                        if diversity_profile["languages"].get(language, 0) < 0.3:
                            diversity_score += 0.1
                            break
                
                # Background diversity (theater vs film school vs self-taught)
                if "training" in metadata:
                    training = metadata["training"]
                    if diversity_profile["training"].get(training, 0) < 0.2:
                        diversity_score += 0.2
                
                result["diversity_score"] = min(1.0, diversity_score)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to apply diversity factors: {e}")
            return results
    
    async def generate_explanation(
        self,
        result: Dict[str, Any],
        ranking_factors: Dict[str, float]
    ) -> str:
        """
        Generate human-readable explanation for ranking.
        
        Args:
            result: Search result
            ranking_factors: Factors contributing to rank
            
        Returns:
            Explanation text
        """
        try:
            explanations = []
            
            # Sort factors by contribution
            sorted_factors = sorted(
                ranking_factors.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            # Generate explanations for top factors
            for factor, score in sorted_factors[:3]:
                if score > 0.7:
                    strength = "Strong"
                elif score > 0.4:
                    strength = "Good"
                else:
                    strength = "Moderate"
                
                if factor == "relevance":
                    explanations.append(f"{strength} match with search criteria")
                elif factor == "experience":
                    explanations.append(f"{strength} experience in similar roles")
                elif factor == "popularity":
                    explanations.append(f"{strength} audience appeal")
                elif factor == "recency":
                    explanations.append("Recently active in industry")
                elif factor == "availability":
                    explanations.append("Available for the project timeline")
                elif factor == "chemistry":
                    explanations.append(f"{strength} chemistry with selected cast")
                elif factor == "diversity":
                    explanations.append("Adds diversity to the cast")
                elif factor == "performance":
                    explanations.append("Recent successful performances")
            
            # Add specific highlights
            metadata = result.get("metadata", {})
            if metadata.get("recent_awards"):
                explanations.append("Award-winning talent")
            
            if metadata.get("languages") and len(metadata["languages"]) > 2:
                explanations.append("Multilingual abilities")
            
            return ". ".join(explanations) if explanations else "Well-suited for the role"
            
        except Exception as e:
            logger.error(f"Failed to generate explanation: {e}")
            return "Good match for your requirements"
    
    async def rank_with_ml_scoring(
        self,
        results: List[Dict[str, Any]],
        query: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Rank results using comprehensive ML scoring.
        
        Args:
            results: Search results to rank
            query: Original search query
            user_context: User and project context
            
        Returns:
            Ranked results with scores and explanations
        """
        try:
            # Extract user and project info from context
            user_id = user_context.get("user_id") if user_context else None
            with_cast = user_context.get("selected_cast", []) if user_context else []
            user_history = user_context.get("history") if user_context else None
            
            # Step 1: Calculate relevance scores
            for result in results:
                result["relevance_score"] = await self.calculate_relevance_score(
                    result,
                    query
                )
            
            # Step 2: Apply user preferences
            if user_id:
                results = await self.apply_user_preferences(
                    results,
                    user_id,
                    user_history
                )
            
            # Step 3: Boost recent successes
            results = await self.boost_recent_successes(results)
            
            # Step 4: Consider chemistry with cast
            if with_cast:
                results = await self.consider_chemistry_scores(results, with_cast)
            
            # Step 5: Apply diversity factors
            results = await self.apply_diversity_factors(results, with_cast)
            
            # Step 6: Calculate final scores
            for result in results:
                # Collect all scoring factors
                factors = {
                    "relevance": result.get("relevance_score", 0.0),
                    "experience": await self._calculate_experience_score(result),
                    "popularity": await self._calculate_popularity_score(result),
                    "recency": await self._calculate_recency_score(result),
                    "availability": result.get("availability_score", 0.5),
                    "chemistry": result.get("chemistry_score", 0.5),
                    "diversity": result.get("diversity_score", 0.0)
                }
                
                # Add user preference if available
                if "preference_score" in result:
                    factors["preference"] = result["preference_score"]
                
                # Add performance boost if available
                if "performance_boost" in result:
                    factors["performance"] = result["performance_boost"]
                
                # Calculate weighted final score
                final_score = 0.0
                for factor, score in factors.items():
                    weight = self.feature_weights.get(factor, 0.1)
                    final_score += score * weight
                
                result["final_score"] = min(1.0, final_score)
                result["ranking_factors"] = factors
                
                # Generate explanation
                result["ranking_explanation"] = await self.generate_explanation(
                    result,
                    factors
                )
            
            # Sort by final score
            ranked_results = sorted(
                results,
                key=lambda x: x["final_score"],
                reverse=True
            )
            
            # Add rank positions
            for i, result in enumerate(ranked_results):
                result["rank"] = i + 1
            
            logger.info(f"Ranked {len(ranked_results)} results with ML scoring")
            return ranked_results
            
        except Exception as e:
            logger.error(f"ML scoring failed: {e}")
            # Fallback to simple scoring
            return sorted(
                results,
                key=lambda x: x.get("semantic_score", 0.0),
                reverse=True
            )
    
    # Helper methods
    
    async def _calculate_skill_match(
        self,
        talent: Dict[str, Any],
        query: Dict[str, Any]
    ) -> float:
        """Calculate skill matching score."""
        try:
            required_skills = query.get("skills", [])
            if not required_skills:
                return 0.5  # Neutral if no skills specified
            
            talent_skills = talent.get("metadata", {}).get("skills", [])
            if isinstance(talent_skills, str):
                talent_skills = talent_skills.split(",")
            
            if not talent_skills:
                return 0.0
            
            # Calculate overlap
            required_set = set(s.lower().strip() for s in required_skills)
            talent_set = set(s.lower().strip() for s in talent_skills)
            
            overlap = required_set.intersection(talent_set)
            
            if required_set:
                return len(overlap) / len(required_set)
            
            return 0.0
            
        except Exception:
            return 0.0
    
    async def _calculate_genre_match(
        self,
        talent: Dict[str, Any],
        query: Dict[str, Any]
    ) -> float:
        """Calculate genre matching score."""
        try:
            required_genres = query.get("genres", [])
            if not required_genres:
                return 0.5  # Neutral if no genres specified
            
            talent_genres = talent.get("metadata", {}).get("genres", [])
            if not talent_genres:
                return 0.0
            
            # Calculate overlap
            required_set = set(g.lower() for g in required_genres)
            talent_set = set(g.lower() for g in talent_genres)
            
            overlap = required_set.intersection(talent_set)
            
            if required_set:
                return len(overlap) / len(required_set)
            
            return 0.0
            
        except Exception:
            return 0.0
    
    async def _calculate_language_match(
        self,
        talent: Dict[str, Any],
        query: Dict[str, Any]
    ) -> float:
        """Calculate language matching score."""
        try:
            required_languages = query.get("languages", [])
            if not required_languages:
                return 0.5  # Neutral if no languages specified
            
            talent_languages = talent.get("metadata", {}).get("languages", [])
            if not talent_languages:
                return 0.0
            
            # Calculate overlap
            required_set = set(l.lower() for l in required_languages)
            talent_set = set(l.lower() for l in talent_languages)
            
            overlap = required_set.intersection(talent_set)
            
            if required_set:
                return len(overlap) / len(required_set)
            
            return 0.0
            
        except Exception:
            return 0.0
    
    async def _calculate_physical_match(
        self,
        talent: Dict[str, Any],
        query: Dict[str, Any]
    ) -> float:
        """Calculate physical attributes matching score."""
        try:
            score = 0.5  # Start with neutral
            matches = 0
            total = 0
            
            metadata = talent.get("metadata", {})
            
            # Age match
            if "age_range" in query and metadata.get("age"):
                total += 1
                age = metadata["age"]
                age_range = query["age_range"]
                if age_range[0] <= age <= age_range[1]:
                    matches += 1
            
            # Height match
            if "height_range" in query and metadata.get("height"):
                total += 1
                # Parse height and compare
                # Implementation depends on height format
                matches += 0.5  # Partial match for now
            
            # Gender match
            if "gender" in query and metadata.get("gender"):
                total += 1
                if query["gender"].lower() == metadata["gender"].lower():
                    matches += 1
            
            if total > 0:
                score = matches / total
            
            return score
            
        except Exception:
            return 0.5
    
    async def _load_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Load user preferences from database or cache."""
        try:
            # Check cache first
            if user_id in self.user_preferences:
                return self.user_preferences[user_id]
            
            # TODO: Load from database
            # For now, return default preferences
            return {
                "genres": [],
                "age_preference": {"min": 20, "max": 40},
                "locations": ["Mumbai"],
                "liked_talents": []
            }
            
        except Exception:
            return {}
    
    async def _update_preferences_from_history(
        self,
        preferences: Dict[str, Any],
        history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Update preferences based on user history."""
        try:
            # Analyze clicked/selected talents
            for interaction in history:
                if interaction.get("action") == "clicked":
                    talent_data = interaction.get("talent_data", {})
                    
                    # Update genre preferences
                    if talent_data.get("genres"):
                        if "genres" not in preferences:
                            preferences["genres"] = []
                        preferences["genres"].extend(talent_data["genres"])
                    
                    # Update liked talents
                    if "liked_talents" not in preferences:
                        preferences["liked_talents"] = []
                    preferences["liked_talents"].append(talent_data.get("id"))
            
            # Deduplicate
            if "genres" in preferences:
                preferences["genres"] = list(set(preferences["genres"]))
            
            return preferences
            
        except Exception:
            return preferences
    
    async def _load_performance_data(
        self,
        talent_ids: List[str]
    ) -> Dict[str, Any]:
        """Load performance data for talents."""
        try:
            # TODO: Load from database
            # For now, return simulated data
            performance_data = {}
            
            for talent_id in talent_ids[:10]:  # Limit for performance
                performance_data[talent_id] = {
                    "recent_box_office": np.random.randint(10_000_000, 200_000_000),
                    "recent_awards": np.random.randint(0, 3),
                    "average_rating": np.random.uniform(6.0, 9.5),
                    "is_trending": np.random.choice([True, False], p=[0.2, 0.8])
                }
            
            return performance_data
            
        except Exception:
            return {}
    
    async def _get_chemistry_score(
        self,
        talent1_id: str,
        talent2_id: str
    ) -> float:
        """Get chemistry score between two talents."""
        try:
            # Check cache
            key = f"{talent1_id}:{talent2_id}"
            if key in self.chemistry_matrix:
                return self.chemistry_matrix[key]
            
            # Check reverse key
            reverse_key = f"{talent2_id}:{talent1_id}"
            if reverse_key in self.chemistry_matrix:
                return self.chemistry_matrix[reverse_key]
            
            # TODO: Calculate based on past collaborations
            # For now, return random score
            score = np.random.uniform(0.3, 0.9)
            
            # Cache the score
            self.chemistry_matrix[key] = score
            
            return score
            
        except Exception:
            return 0.5
    
    def _analyze_diversity(
        self,
        current_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze diversity in current selection."""
        try:
            diversity_profile = {
                "gender": defaultdict(float),
                "age_groups": defaultdict(float),
                "locations": defaultdict(float),
                "languages": defaultdict(float),
                "training": defaultdict(float)
            }
            
            if not current_results:
                return diversity_profile
            
            total = len(current_results)
            
            for result in current_results:
                metadata = result.get("metadata", {})
                
                # Gender distribution
                if metadata.get("gender"):
                    diversity_profile["gender"][metadata["gender"]] += 1 / total
                
                # Age distribution
                if metadata.get("age"):
                    age_group = metadata["age"] // 10
                    diversity_profile["age_groups"][age_group] += 1 / total
                
                # Location distribution
                if metadata.get("location"):
                    diversity_profile["locations"][metadata["location"]] += 1 / total
                
                # Language distribution
                if metadata.get("languages"):
                    for language in metadata["languages"]:
                        diversity_profile["languages"][language] += 1 / total
                
                # Training background
                if metadata.get("training"):
                    diversity_profile["training"][metadata["training"]] += 1 / total
            
            return diversity_profile
            
        except Exception:
            return {"gender": {}, "age_groups": {}, "locations": {}, "languages": {}, "training": {}
            
        }
    
    async def _calculate_experience_score(self, result: Dict[str, Any]) -> float:
        """Calculate experience score for talent."""
        try:
            metadata = result.get("metadata", {})
            score = 0.0
            
            # Years of experience
            if metadata.get("experience_years"):
                years = metadata["experience_years"]
                if years > 10:
                    score += 0.4
                elif years > 5:
                    score += 0.3
                elif years > 2:
                    score += 0.2
                else:
                    score += 0.1
            
            # Number of projects
            if metadata.get("project_count"):
                count = metadata["project_count"]
                score += min(0.3, count * 0.01)
            
            # Awards
            if metadata.get("awards"):
                score += min(0.3, len(metadata["awards"]) * 0.1)
            
            return min(1.0, score)
            
        except Exception:
            return 0.0
    
    async def _calculate_popularity_score(self, result: Dict[str, Any]) -> float:
        """Calculate popularity score for talent."""
        try:
            metadata = result.get("metadata", {})
            score = 0.0
            
            # Social media following
            if metadata.get("social_followers"):
                followers = metadata["social_followers"]
                if followers > 1_000_000:
                    score += 0.4
                elif followers > 100_000:
                    score += 0.3
                elif followers > 10_000:
                    score += 0.2
                else:
                    score += 0.1
            
            # Fan rating
            if metadata.get("fan_rating"):
                score += metadata["fan_rating"] / 10 * 0.3
            
            # Media mentions
            if metadata.get("media_mentions"):
                score += min(0.3, metadata["media_mentions"] * 0.001)
            
            return min(1.0, score)
            
        except Exception:
            return 0.0
    
    async def _calculate_recency_score(self, result: Dict[str, Any]) -> float:
        """Calculate recency score based on recent activity."""
        try:
            metadata = result.get("metadata", {})
            score = 0.0
            
            # Last project date
            if metadata.get("last_project_date"):
                last_date = datetime.fromisoformat(metadata["last_project_date"])
                days_ago = (datetime.utcnow() - last_date).days
                
                if days_ago < 90:  # Within 3 months
                    score = 1.0
                elif days_ago < 180:  # Within 6 months
                    score = 0.8
                elif days_ago < 365:  # Within 1 year
                    score = 0.6
                elif days_ago < 730:  # Within 2 years
                    score = 0.4
                else:
                    score = 0.2
            
            return score
            
        except Exception:
            return 0.5
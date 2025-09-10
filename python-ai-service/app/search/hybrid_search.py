"""Hybrid search implementation combining semantic and keyword search."""

import asyncio
from typing import List, Dict, Any, Optional, Tuple, Set
from loguru import logger
from datetime import datetime
import numpy as np
from collections import defaultdict
import re

from app.search.pinecone_client import PineconeSearchSystem
from app.search.embedding_pipeline import TalentEmbeddingPipeline
from app.search.conversational_search import ConversationalSearch, SearchCriteria
from app.database.connection import async_db
from app.core.config import settings


class HybridSearch:
    """Advanced hybrid search combining semantic vectors and keyword matching."""
    
    def __init__(self):
        """Initialize hybrid search components."""
        self.pinecone_client = PineconeSearchSystem()
        self.embedding_pipeline = TalentEmbeddingPipeline()
        self.conversational_search = ConversationalSearch()
        
        # Search weights
        self.weights = {
            "semantic": 0.6,
            "keyword": 0.2,
            "attribute": 0.2
        }
        
        # Performance settings
        self.initial_retrieval_size = 100
        self.rerank_size = 50
        self.final_results_size = 20
        
        # Cache for performance
        self.keyword_cache = {}
        self.cache_ttl = 300  # 5 minutes
    
    async def semantic_search(
        self,
        query_embedding: List[float],
        top_k: int = 50,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic vector search.
        
        Args:
            query_embedding: Query vector
            top_k: Number of results
            filters: Optional filters
            
        Returns:
            Semantic search results
        """
        try:
            # Search using Pinecone
            results = await self.pinecone_client.hybrid_search(
                query_embedding=query_embedding,
                filters=filters,
                top_k=top_k,
                include_metadata=True
            )
            
            # Normalize scores
            if results:
                max_score = max(r["score"] for r in results)
                min_score = min(r["score"] for r in results)
                score_range = max_score - min_score if max_score != min_score else 1.0
                
                for result in results:
                    result["semantic_score"] = (result["score"] - min_score) / score_range
            
            return results
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    async def keyword_filter(
        self,
        results: List[Dict[str, Any]],
        keywords: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Filter results based on keyword matching.
        
        Args:
            results: Initial results
            keywords: Keywords to match
            
        Returns:
            Filtered and scored results
        """
        try:
            if not keywords:
                return results
            
            # Prepare keywords for matching
            keywords_lower = [kw.lower() for kw in keywords]
            
            for result in results:
                keyword_score = 0.0
                metadata = result.get("metadata", {})
                
                # Check various fields for keywords
                searchable_text = self._get_searchable_text(metadata)
                searchable_lower = searchable_text.lower()
                
                # Count keyword matches
                for keyword in keywords_lower:
                    if keyword in searchable_lower:
                        # Exact match gets higher score
                        if f" {keyword} " in f" {searchable_lower} ":
                            keyword_score += 1.0
                        else:
                            keyword_score += 0.5
                
                # Normalize keyword score
                if keywords:
                    result["keyword_score"] = keyword_score / len(keywords)
                else:
                    result["keyword_score"] = 0.0
            
            return results
            
        except Exception as e:
            logger.error(f"Keyword filtering failed: {e}")
            return results
    
    async def attribute_filter(
        self,
        results: List[Dict[str, Any]],
        age: Optional[Tuple[int, int]] = None,
        height: Optional[Tuple[float, float]] = None,
        location: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Filter results based on specific attributes.
        
        Args:
            results: Initial results
            age: Age range filter
            height: Height range filter
            location: Location filter
            
        Returns:
            Filtered results
        """
        try:
            filtered_results = []
            
            for result in results:
                metadata = result.get("metadata", {})
                attribute_score = 1.0
                passes_filter = True
                
                # Age filter
                if age and metadata.get("age"):
                    talent_age = metadata["age"]
                    if talent_age < age[0] or talent_age > age[1]:
                        passes_filter = False
                    else:
                        # Score based on how close to ideal age (middle of range)
                        ideal_age = (age[0] + age[1]) / 2
                        age_diff = abs(talent_age - ideal_age)
                        max_diff = (age[1] - age[0]) / 2
                        attribute_score *= (1 - (age_diff / max_diff) * 0.3)
                
                # Height filter
                if height and metadata.get("height"):
                    talent_height = self._parse_height(metadata["height"])
                    if talent_height:
                        if talent_height < height[0] or talent_height > height[1]:
                            passes_filter = False
                        else:
                            # Score based on height match
                            ideal_height = (height[0] + height[1]) / 2
                            height_diff = abs(talent_height - ideal_height)
                            max_diff = (height[1] - height[0]) / 2
                            attribute_score *= (1 - (height_diff / max_diff) * 0.2)
                
                # Location filter
                if location and metadata.get("location"):
                    talent_location = metadata["location"].lower()
                    if location.lower() not in talent_location:
                        # Soft filter - reduce score instead of eliminating
                        attribute_score *= 0.5
                
                result["attribute_score"] = attribute_score
                
                if passes_filter:
                    filtered_results.append(result)
            
            return filtered_results
            
        except Exception as e:
            logger.error(f"Attribute filtering failed: {e}")
            return results
    
    async def availability_check(
        self,
        results: List[Dict[str, Any]],
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> List[Dict[str, Any]]:
        """
        Check talent availability for given date range.
        
        Args:
            results: Search results
            date_range: Required availability period
            
        Returns:
            Results with availability status
        """
        try:
            if not date_range:
                # No date filter, all are considered available
                for result in results:
                    result["availability_score"] = 1.0
                return results
            
            # Get talent IDs
            talent_ids = [r["id"] for r in results]
            
            # Query database for availability
            availability_data = await self._get_availability_from_db(talent_ids, date_range)
            
            # Update results with availability
            for result in results:
                talent_id = result["id"]
                if talent_id in availability_data:
                    availability = availability_data[talent_id]
                    result["availability_score"] = availability["score"]
                    result["availability_status"] = availability["status"]
                else:
                    # Unknown availability
                    result["availability_score"] = 0.5
                    result["availability_status"] = "unknown"
            
            return results
            
        except Exception as e:
            logger.error(f"Availability check failed: {e}")
            return results
    
    async def budget_filter(
        self,
        results: List[Dict[str, Any]],
        salary_range: Optional[Tuple[float, float]] = None
    ) -> List[Dict[str, Any]]:
        """
        Filter results based on budget/salary requirements.
        
        Args:
            results: Search results
            salary_range: Budget range
            
        Returns:
            Filtered results
        """
        try:
            if not salary_range:
                return results
            
            filtered_results = []
            
            for result in results:
                metadata = result.get("metadata", {})
                
                # Check if talent has budget information
                if "budget_min" in metadata and "budget_max" in metadata:
                    talent_min = metadata["budget_min"]
                    talent_max = metadata["budget_max"]
                    
                    # Check if ranges overlap
                    if (talent_max >= salary_range[0] and talent_min <= salary_range[1]):
                        # Calculate budget match score
                        overlap_start = max(talent_min, salary_range[0])
                        overlap_end = min(talent_max, salary_range[1])
                        overlap = overlap_end - overlap_start
                        
                        talent_range = talent_max - talent_min
                        budget_range = salary_range[1] - salary_range[0]
                        
                        # Score based on overlap percentage
                        budget_score = overlap / min(talent_range, budget_range) if min(talent_range, budget_range) > 0 else 1.0
                        result["budget_score"] = budget_score
                        
                        filtered_results.append(result)
                else:
                    # No budget info, include with neutral score
                    result["budget_score"] = 0.5
                    filtered_results.append(result)
            
            return filtered_results
            
        except Exception as e:
            logger.error(f"Budget filtering failed: {e}")
            return results
    
    async def combine_scores(
        self,
        semantic_score: float,
        filter_scores: Dict[str, float]
    ) -> float:
        """
        Combine multiple scoring factors.
        
        Args:
            semantic_score: Semantic similarity score
            filter_scores: Dictionary of filter scores
            
        Returns:
            Combined score
        """
        try:
            # Start with semantic score
            combined = semantic_score * self.weights["semantic"]
            
            # Add keyword score if present
            if "keyword_score" in filter_scores:
                combined += filter_scores["keyword_score"] * self.weights["keyword"]
            
            # Add attribute scores
            attribute_scores = []
            for key in ["attribute_score", "availability_score", "budget_score"]:
                if key in filter_scores:
                    attribute_scores.append(filter_scores[key])
            
            if attribute_scores:
                avg_attribute = sum(attribute_scores) / len(attribute_scores)
                combined += avg_attribute * self.weights["attribute"]
            
            return combined
            
        except Exception as e:
            logger.error(f"Score combination failed: {e}")
            return semantic_score
    
    async def rank_results(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Rank results based on combined scores.
        
        Args:
            results: Search results with various scores
            
        Returns:
            Ranked results
        """
        try:
            # Calculate combined scores
            for result in results:
                filter_scores = {
                    k: v for k, v in result.items()
                    if k.endswith("_score") and k != "semantic_score"
                }
                
                result["combined_score"] = await self.combine_scores(
                    result.get("semantic_score", 0.0),
                    filter_scores
                )
            
            # Sort by combined score
            ranked = sorted(results, key=lambda x: x["combined_score"], reverse=True)
            
            # Add ranking position
            for i, result in enumerate(ranked):
                result["rank"] = i + 1
            
            return ranked
            
        except Exception as e:
            logger.error(f"Result ranking failed: {e}")
            return results
    
    async def hybrid_search_pipeline(
        self,
        query: str,
        criteria: Optional[SearchCriteria] = None,
        top_k: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Execute complete hybrid search pipeline.
        
        Args:
            query: Search query
            criteria: Search criteria
            top_k: Number of results to return
            
        Returns:
            Final search results
        """
        try:
            # Parse query if criteria not provided
            if not criteria:
                parsed = await self.conversational_search.parse_natural_query(query)
                criteria = SearchCriteria(**parsed.get("criteria", {}))
            
            # Generate query embedding
            query_embedding = await self.embedding_pipeline.generate_text_embedding(query)
            
            # Stage 1: Initial semantic retrieval
            logger.info("Stage 1: Semantic search")
            semantic_results = await self.semantic_search(
                query_embedding=query_embedding,
                top_k=self.initial_retrieval_size,
                filters=self._prepare_pinecone_filters(criteria)
            )
            
            if not semantic_results:
                logger.warning("No semantic results found")
                return []
            
            # Stage 2: Keyword filtering
            logger.info("Stage 2: Keyword filtering")
            keywords = self._extract_keywords(query, criteria)
            keyword_filtered = await self.keyword_filter(semantic_results, keywords)
            
            # Stage 3: Attribute filtering
            logger.info("Stage 3: Attribute filtering")
            attribute_filtered = await self.attribute_filter(
                keyword_filtered,
                age=criteria.age_range,
                location=criteria.location
            )
            
            # Stage 4: Availability check
            logger.info("Stage 4: Availability check")
            availability_checked = await self.availability_check(
                attribute_filtered,
                date_range=None  # TODO: Extract from criteria
            )
            
            # Stage 5: Budget filtering
            logger.info("Stage 5: Budget filtering")
            budget_filtered = await self.budget_filter(
                availability_checked,
                salary_range=criteria.budget_range
            )
            
            # Stage 6: Ranking
            logger.info("Stage 6: Final ranking")
            ranked_results = await self.rank_results(budget_filtered)
            
            # Return top-k results
            final_results = ranked_results[:top_k]
            
            # Enrich results with database information
            final_results = await self._enrich_results(final_results)
            
            logger.info(f"Hybrid search completed: {len(final_results)} results")
            return final_results
            
        except Exception as e:
            logger.error(f"Hybrid search pipeline failed: {e}")
            return []
    
    async def multi_stage_ranking(
        self,
        initial_results: List[Dict[str, Any]],
        query_embedding: List[float],
        top_k: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Perform multi-stage ranking for precision.
        
        Args:
            initial_results: Initial retrieval results
            query_embedding: Query vector
            top_k: Final number of results
            
        Returns:
            Re-ranked results
        """
        try:
            # Stage 1: Fast initial scoring
            stage1_results = initial_results[:self.rerank_size]
            
            # Stage 2: Detailed re-ranking
            for result in stage1_results:
                # Compute more precise similarity
                if "embedding" in result:
                    precise_similarity = self._compute_similarity(
                        query_embedding,
                        result["embedding"]
                    )
                    result["precise_score"] = precise_similarity
            
            # Stage 3: Diversity injection
            diverse_results = await self._inject_diversity(stage1_results)
            
            # Final selection
            final_results = diverse_results[:top_k]
            
            return final_results
            
        except Exception as e:
            logger.error(f"Multi-stage ranking failed: {e}")
            return initial_results[:top_k]
    
    # Helper methods
    
    def _get_searchable_text(self, metadata: Dict[str, Any]) -> str:
        """Extract searchable text from metadata."""
        parts = []
        
        for key in ["name", "skills", "languages", "biography", "description"]:
            if key in metadata:
                value = metadata[key]
                if isinstance(value, list):
                    parts.append(" ".join(str(v) for v in value))
                else:
                    parts.append(str(value))
        
        return " ".join(parts)
    
    def _parse_height(self, height_str: str) -> Optional[float]:
        """Parse height string to float (in cm)."""
        try:
            # Extract numeric value
            match = re.search(r"(\d+(?:\.\d+)?)", height_str)
            if match:
                value = float(match.group(1))
                
                # Convert to cm if needed
                if "ft" in height_str or "feet" in height_str:
                    return value * 30.48
                elif "m" in height_str:
                    return value * 100
                else:
                    return value  # Assume cm
            
            return None
            
        except Exception:
            return None
    
    async def _get_availability_from_db(
        self,
        talent_ids: List[str],
        date_range: Tuple[datetime, datetime]
    ) -> Dict[str, Dict[str, Any]]:
        """Get availability information from database."""
        try:
            # Placeholder for database query
            # In production, this would query the actual database
            availability_data = {}
            
            for talent_id in talent_ids:
                # Simulate availability check
                availability_data[talent_id] = {
                    "score": 1.0,  # Available
                    "status": "available"
                }
            
            return availability_data
            
        except Exception as e:
            logger.error(f"Database availability query failed: {e}")
            return {}
    
    def _prepare_pinecone_filters(
        self,
        criteria: SearchCriteria
    ) -> Dict[str, Any]:
        """Prepare filters for Pinecone query."""
        filters = {}
        
        if criteria.gender:
            filters["gender"] = criteria.gender
        
        if criteria.location:
            filters["location"] = criteria.location
        
        if criteria.languages:
            filters["languages"] = {"$in": criteria.languages}
        
        return filters
    
    def _extract_keywords(
        self,
        query: str,
        criteria: SearchCriteria
    ) -> List[str]:
        """Extract keywords from query and criteria."""
        keywords = []
        
        # Extract from skills
        if criteria.skills:
            keywords.extend(criteria.skills)
        
        # Extract from genres
        if criteria.genres:
            keywords.extend(criteria.genres)
        
        # Extract important words from query
        important_words = ["sing", "dance", "action", "comedy", "drama", "theater", "film"]
        for word in important_words:
            if word in query.lower():
                keywords.append(word)
        
        return list(set(keywords))
    
    def _compute_similarity(
        self,
        vec1: List[float],
        vec2: List[float]
    ) -> float:
        """Compute cosine similarity between vectors."""
        try:
            vec1_np = np.array(vec1)
            vec2_np = np.array(vec2)
            
            dot_product = np.dot(vec1_np, vec2_np)
            norm1 = np.linalg.norm(vec1_np)
            norm2 = np.linalg.norm(vec2_np)
            
            if norm1 * norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
            
        except Exception:
            return 0.0
    
    async def _inject_diversity(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Inject diversity into search results."""
        try:
            diverse_results = []
            seen_attributes = defaultdict(int)
            
            for result in results:
                metadata = result.get("metadata", {})
                
                # Track diversity dimensions
                age_group = metadata.get("age", 0) // 10
                gender = metadata.get("gender", "unknown")
                location = metadata.get("location", "unknown")
                
                diversity_key = f"{age_group}_{gender}_{location}"
                
                # Penalize over-representation
                if seen_attributes[diversity_key] < 2:
                    diverse_results.append(result)
                    seen_attributes[diversity_key] += 1
                elif result["combined_score"] > 0.9:  # Very high score, include anyway
                    diverse_results.append(result)
            
            return diverse_results
            
        except Exception as e:
            logger.error(f"Diversity injection failed: {e}")
            return results
    
    async def _enrich_results(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Enrich results with additional database information."""
        try:
            # In production, this would fetch additional data from database
            for result in results:
                # Add match explanation
                result["match_explanation"] = self._generate_match_explanation(result)
                
                # Add quick stats
                result["quick_stats"] = {
                    "match_score": result.get("combined_score", 0.0),
                    "availability": result.get("availability_status", "unknown"),
                    "location": result.get("metadata", {}).get("location", "unknown")
                }
            
            return results
            
        except Exception as e:
            logger.error(f"Result enrichment failed: {e}")
            return results
    
    def _generate_match_explanation(self, result: Dict[str, Any]) -> str:
        """Generate explanation for why this is a good match."""
        explanations = []
        
        if result.get("semantic_score", 0) > 0.8:
            explanations.append("Strong profile match")
        
        if result.get("keyword_score", 0) > 0.7:
            explanations.append("Matches key skills")
        
        if result.get("availability_score", 0) == 1.0:
            explanations.append("Available for project")
        
        if result.get("budget_score", 0) > 0.8:
            explanations.append("Within budget range")
        
        return ", ".join(explanations) if explanations else "Good overall match"
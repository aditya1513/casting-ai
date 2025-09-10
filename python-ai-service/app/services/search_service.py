"""Semantic search service using Pinecone and OpenAI embeddings."""

import openai
from pinecone import Pinecone, ServerlessSpec
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
import hashlib
import json
from datetime import datetime
from sentence_transformers import SentenceTransformer
import asyncio

from app.core.config import settings
from app.database.connection import async_db


class EmbeddingService:
    """Service for generating embeddings using multiple models."""
    
    def __init__(self):
        """Initialize embedding models."""
        # OpenAI embeddings
        if settings.openai_api_key:
            self.openai_client = openai.OpenAI(api_key=settings.openai_api_key)
        else:
            self.openai_client = None
        
        # Local sentence transformer as fallback
        try:
            self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Loaded local sentence transformer model")
        except Exception as e:
            logger.warning(f"Could not load sentence transformer: {e}")
            self.sentence_model = None
    
    async def generate_embedding(
        self,
        text: str,
        model: str = "text-embedding-ada-002"
    ) -> List[float]:
        """
        Generate embedding for text.
        
        Args:
            text: Text to embed
            model: Model to use for embedding
            
        Returns:
            Embedding vector
        """
        try:
            if self.openai_client and model.startswith("text-embedding"):
                # Use OpenAI embeddings
                response = self.openai_client.embeddings.create(
                    model=model,
                    input=text
                )
                return response.data[0].embedding
            
            elif self.sentence_model:
                # Use local sentence transformer
                embedding = self.sentence_model.encode(text)
                return embedding.tolist()
            
            else:
                # Fallback to random embedding (for testing only)
                logger.warning("Using random embeddings - not suitable for production")
                np.random.seed(hash(text) % 2**32)
                return np.random.randn(384).tolist()
                
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            # Return zero vector on error
            return [0.0] * 384
    
    async def batch_generate_embeddings(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batches.
        
        Args:
            texts: List of texts to embed
            batch_size: Batch size for processing
            
        Returns:
            List of embedding vectors
        """
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            if self.openai_client:
                try:
                    response = self.openai_client.embeddings.create(
                        model="text-embedding-ada-002",
                        input=batch
                    )
                    batch_embeddings = [item.embedding for item in response.data]
                    embeddings.extend(batch_embeddings)
                except Exception as e:
                    logger.error(f"Error in batch embedding: {e}")
                    # Generate individual embeddings as fallback
                    for text in batch:
                        embedding = await self.generate_embedding(text)
                        embeddings.append(embedding)
            else:
                # Use sentence transformer or fallback
                for text in batch:
                    embedding = await self.generate_embedding(text)
                    embeddings.append(embedding)
        
        return embeddings


class PineconeService:
    """Service for managing Pinecone vector database."""
    
    def __init__(self):
        """Initialize Pinecone client and index."""
        self.pc = None
        self.index = None
        self.embedding_service = EmbeddingService()
        
        if settings.pinecone_api_key:
            try:
                self.pc = Pinecone(api_key=settings.pinecone_api_key)
                self._initialize_index()
            except Exception as e:
                logger.error(f"Failed to initialize Pinecone: {e}")
    
    def _initialize_index(self):
        """Initialize or connect to Pinecone index."""
        try:
            # Check if index exists
            existing_indexes = self.pc.list_indexes()
            
            if settings.pinecone_index_name not in [idx.name for idx in existing_indexes]:
                # Create new index
                self.pc.create_index(
                    name=settings.pinecone_index_name,
                    dimension=settings.pinecone_dimension,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region=settings.pinecone_environment
                    )
                )
                logger.info(f"Created Pinecone index: {settings.pinecone_index_name}")
            
            # Connect to index
            self.index = self.pc.Index(settings.pinecone_index_name)
            logger.info(f"Connected to Pinecone index: {settings.pinecone_index_name}")
            
        except Exception as e:
            logger.error(f"Error initializing Pinecone index: {e}")
    
    async def upsert_talent_profile(
        self,
        talent_id: str,
        profile_data: Dict[str, Any]
    ) -> bool:
        """
        Upsert talent profile to vector database.
        
        Args:
            talent_id: Unique talent identifier
            profile_data: Talent profile data
            
        Returns:
            Success status
        """
        try:
            if not self.index:
                logger.error("Pinecone index not initialized")
                return False
            
            # Create text representation of profile
            profile_text = self._create_profile_text(profile_data)
            
            # Generate embedding
            embedding = await self.embedding_service.generate_embedding(profile_text)
            
            # Prepare metadata
            metadata = {
                "talent_id": talent_id,
                "name": f"{profile_data.get('firstName', '')} {profile_data.get('lastName', '')}",
                "gender": profile_data.get("gender"),
                "age": profile_data.get("age"),
                "city": profile_data.get("currentCity"),
                "state": profile_data.get("currentState"),
                "languages": json.dumps(profile_data.get("languages", [])),
                "skills": json.dumps(profile_data.get("actingSkills", [])),
                "experience_level": profile_data.get("experienceLevel"),
                "rating": profile_data.get("rating", 0),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Upsert to Pinecone
            self.index.upsert(
                vectors=[(talent_id, embedding, metadata)],
                namespace="talents"
            )
            
            logger.debug(f"Upserted talent {talent_id} to vector database")
            return True
            
        except Exception as e:
            logger.error(f"Error upserting talent profile: {e}")
            return False
    
    async def search_similar_talents(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for similar talents using semantic search.
        
        Args:
            query: Search query
            filters: Metadata filters
            top_k: Number of results
            
        Returns:
            List of similar talents with scores
        """
        try:
            if not self.index:
                logger.error("Pinecone index not initialized")
                return []
            
            # Generate query embedding
            query_embedding = await self.embedding_service.generate_embedding(query)
            
            # Build filter dict for Pinecone
            pinecone_filter = {}
            if filters:
                if "gender" in filters:
                    pinecone_filter["gender"] = filters["gender"]
                if "city" in filters:
                    pinecone_filter["city"] = filters["city"]
                if "experience_level" in filters:
                    pinecone_filter["experience_level"] = filters["experience_level"]
                if "min_rating" in filters:
                    pinecone_filter["rating"] = {"$gte": filters["min_rating"]}
            
            # Query Pinecone
            results = self.index.query(
                vector=query_embedding,
                filter=pinecone_filter if pinecone_filter else None,
                top_k=top_k,
                include_metadata=True,
                namespace="talents"
            )
            
            # Format results
            talents = []
            for match in results.matches:
                talent_data = {
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                }
                talents.append(talent_data)
            
            return talents
            
        except Exception as e:
            logger.error(f"Error searching similar talents: {e}")
            return []
    
    async def hybrid_search(
        self,
        query: str,
        keyword_filters: Optional[Dict[str, Any]] = None,
        semantic_weight: float = 0.7,
        top_k: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining semantic and keyword search.
        
        Args:
            query: Search query
            keyword_filters: Keyword-based filters
            semantic_weight: Weight for semantic search (0-1)
            top_k: Number of results
            
        Returns:
            Combined search results
        """
        try:
            # Semantic search
            semantic_results = await self.search_similar_talents(
                query,
                keyword_filters,
                top_k * 2  # Get more results for merging
            )
            
            # Keyword search from database
            keyword_results = await self._keyword_search(
                query,
                keyword_filters,
                top_k * 2
            )
            
            # Combine and rank results
            combined_results = self._merge_search_results(
                semantic_results,
                keyword_results,
                semantic_weight,
                top_k
            )
            
            return combined_results
            
        except Exception as e:
            logger.error(f"Error in hybrid search: {e}")
            return []
    
    async def _keyword_search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Perform keyword-based search in database."""
        try:
            # Build SQL query
            base_query = """
                SELECT 
                    id,
                    "firstName",
                    "lastName",
                    "currentCity",
                    "currentState",
                    gender,
                    "experienceLevel",
                    rating,
                    languages,
                    "actingSkills"
                FROM talents
                WHERE 1=1
            """
            
            params = []
            param_count = 0
            
            # Add text search
            if query:
                param_count += 1
                base_query += f"""
                    AND (
                        "firstName" ILIKE ${param_count}
                        OR "lastName" ILIKE ${param_count}
                        OR "displayName" ILIKE ${param_count}
                        OR biography ILIKE ${param_count}
                    )
                """
                params.append(f"%{query}%")
            
            # Add filters
            if filters:
                if "gender" in filters:
                    param_count += 1
                    base_query += f" AND gender = ${param_count}"
                    params.append(filters["gender"])
                
                if "city" in filters:
                    param_count += 1
                    base_query += f" AND \"currentCity\" = ${param_count}"
                    params.append(filters["city"])
            
            base_query += f" ORDER BY rating DESC LIMIT {limit}"
            
            # Execute query
            rows = await async_db.fetch_all(base_query, *params)
            
            # Format results
            results = []
            for row in rows:
                results.append({
                    "id": row["id"],
                    "score": float(row["rating"]) / 5.0,  # Normalize rating as score
                    "metadata": dict(row)
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error in keyword search: {e}")
            return []
    
    def _merge_search_results(
        self,
        semantic_results: List[Dict],
        keyword_results: List[Dict],
        semantic_weight: float,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Merge and rank results from semantic and keyword search."""
        # Create combined score dictionary
        combined_scores = {}
        
        # Add semantic results
        for result in semantic_results:
            talent_id = result["id"]
            combined_scores[talent_id] = {
                "semantic_score": result["score"],
                "keyword_score": 0,
                "metadata": result["metadata"]
            }
        
        # Add keyword results
        for result in keyword_results:
            talent_id = result["id"]
            if talent_id in combined_scores:
                combined_scores[talent_id]["keyword_score"] = result["score"]
            else:
                combined_scores[talent_id] = {
                    "semantic_score": 0,
                    "keyword_score": result["score"],
                    "metadata": result["metadata"]
                }
        
        # Calculate combined scores
        final_results = []
        for talent_id, scores in combined_scores.items():
            combined_score = (
                semantic_weight * scores["semantic_score"] +
                (1 - semantic_weight) * scores["keyword_score"]
            )
            
            final_results.append({
                "id": talent_id,
                "score": combined_score,
                "semantic_score": scores["semantic_score"],
                "keyword_score": scores["keyword_score"],
                "metadata": scores["metadata"]
            })
        
        # Sort by combined score
        final_results.sort(key=lambda x: x["score"], reverse=True)
        
        return final_results[:top_k]
    
    def _create_profile_text(self, profile_data: Dict[str, Any]) -> str:
        """Create text representation of talent profile for embedding."""
        parts = []
        
        # Basic info
        if profile_data.get("firstName") or profile_data.get("lastName"):
            parts.append(f"Name: {profile_data.get('firstName', '')} {profile_data.get('lastName', '')}")
        
        # Demographics
        if profile_data.get("gender"):
            parts.append(f"Gender: {profile_data['gender']}")
        if profile_data.get("age"):
            parts.append(f"Age: {profile_data['age']}")
        
        # Location
        if profile_data.get("currentCity"):
            parts.append(f"Location: {profile_data['currentCity']}, {profile_data.get('currentState', '')}")
        
        # Skills and experience
        if profile_data.get("experienceLevel"):
            parts.append(f"Experience: {profile_data['experienceLevel']}")
        if profile_data.get("actingSkills"):
            parts.append(f"Skills: {', '.join(profile_data['actingSkills'])}")
        if profile_data.get("languages"):
            parts.append(f"Languages: {', '.join(profile_data['languages'])}")
        
        # Biography
        if profile_data.get("biography"):
            parts.append(f"Bio: {profile_data['biography'][:500]}")
        
        return " | ".join(parts)
    
    async def update_index_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector index."""
        try:
            if not self.index:
                return {"status": "not_initialized"}
            
            stats = self.index.describe_index_stats()
            
            return {
                "total_vectors": stats.total_vector_count,
                "dimensions": stats.dimension,
                "namespaces": stats.namespaces,
                "index_fullness": stats.index_fullness
            }
            
        except Exception as e:
            logger.error(f"Error getting index stats: {e}")
            return {"error": str(e)}


class ScriptAnalyzer:
    """Service for analyzing scripts and extracting character requirements."""
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
    
    async def analyze_character_requirements(
        self,
        script_text: str
    ) -> Dict[str, Any]:
        """
        Analyze script to extract character requirements.
        
        Args:
            script_text: Script content
            
        Returns:
            Character requirements and analysis
        """
        try:
            # Extract character descriptions using NLP
            characters = self._extract_characters(script_text)
            
            # Generate embeddings for each character
            character_embeddings = {}
            for char_name, char_desc in characters.items():
                embedding = await self.embedding_service.generate_embedding(char_desc)
                character_embeddings[char_name] = embedding
            
            # Extract requirements
            requirements = {
                "characters": characters,
                "embeddings": character_embeddings,
                "locations": self._extract_locations(script_text),
                "genre": self._detect_genre(script_text),
                "tone": self._detect_tone(script_text)
            }
            
            return requirements
            
        except Exception as e:
            logger.error(f"Error analyzing script: {e}")
            return {}
    
    def _extract_characters(self, script_text: str) -> Dict[str, str]:
        """Extract character descriptions from script."""
        characters = {}
        
        # Simple pattern matching for character names (can be enhanced)
        import re
        
        # Look for character introductions
        char_pattern = r"([A-Z][A-Z\s]+)(?:\s*\([\d\w\s,]+\))?"
        matches = re.findall(char_pattern, script_text[:5000])  # Check first 5000 chars
        
        for match in matches[:10]:  # Limit to first 10 characters
            char_name = match.strip()
            if len(char_name) > 2 and char_name not in characters:
                # Extract description around character name
                char_desc = self._extract_character_description(script_text, char_name)
                if char_desc:
                    characters[char_name] = char_desc
        
        return characters
    
    def _extract_character_description(self, script_text: str, char_name: str) -> str:
        """Extract description for a specific character."""
        # Find context around character name
        import re
        
        pattern = rf"{char_name}[^.]*\."
        matches = re.findall(pattern, script_text, re.IGNORECASE)
        
        if matches:
            return " ".join(matches[:3])  # First 3 sentences mentioning character
        
        return ""
    
    def _extract_locations(self, script_text: str) -> List[str]:
        """Extract shooting locations from script."""
        locations = []
        
        # Common location indicators
        location_keywords = ["INT.", "EXT.", "LOCATION:", "SCENE:"]
        
        for keyword in location_keywords:
            if keyword in script_text:
                # Extract text after keyword
                import re
                pattern = rf"{keyword}\s*([A-Z][A-Z\s\-]+)"
                matches = re.findall(pattern, script_text)
                locations.extend(matches)
        
        return list(set(locations))[:10]  # Return unique locations
    
    def _detect_genre(self, script_text: str) -> str:
        """Detect genre from script content."""
        genre_keywords = {
            "romance": ["love", "heart", "kiss", "romantic", "relationship"],
            "action": ["fight", "chase", "explosion", "battle", "weapon"],
            "comedy": ["laugh", "funny", "joke", "humor", "hilarious"],
            "drama": ["emotional", "conflict", "struggle", "tears", "intense"],
            "thriller": ["suspense", "danger", "mystery", "threat", "fear"]
        }
        
        scores = {}
        text_lower = script_text.lower()
        
        for genre, keywords in genre_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            scores[genre] = score
        
        # Return genre with highest score
        if scores:
            return max(scores, key=scores.get)
        
        return "drama"  # Default genre
    
    def _detect_tone(self, script_text: str) -> str:
        """Detect tone/mood from script."""
        tone_keywords = {
            "light": ["happy", "bright", "cheerful", "fun", "joyful"],
            "dark": ["grim", "dark", "serious", "heavy", "tragic"],
            "intense": ["intense", "dramatic", "powerful", "emotional", "gripping"],
            "casual": ["casual", "relaxed", "easy", "simple", "light-hearted"]
        }
        
        scores = {}
        text_lower = script_text.lower()
        
        for tone, keywords in tone_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            scores[tone] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        return "neutral"


# Global service instances
embedding_service = EmbeddingService()
pinecone_service = PineconeService()
script_analyzer = ScriptAnalyzer()
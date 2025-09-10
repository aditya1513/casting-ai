"""Talent embedding pipeline for multi-dimensional profile vectorization."""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
from sentence_transformers import SentenceTransformer
import openai
from datetime import datetime
import hashlib
import json
import asyncio
from PIL import Image
import io
import base64

from app.core.config import settings


class TalentEmbeddingPipeline:
    """Advanced pipeline for generating multi-dimensional talent embeddings."""
    
    def __init__(self):
        """Initialize embedding models and configurations."""
        # Text embedding models
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.openai_client = openai.OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        
        # Embedding dimensions
        self.text_dim = 1536  # OpenAI ada-002
        self.skill_dim = 384  # Sentence-BERT
        self.visual_dim = 512  # Visual features (if implemented)
        
        # Feature weights for combining
        self.feature_weights = {
            "text": 0.5,
            "skills": 0.3,
            "attributes": 0.2
        }
        
        # Mumbai industry specific terms
        self.industry_terms = {
            "bollywood": ["hindi cinema", "mumbai film", "bollywood"],
            "genres": ["romance", "action", "drama", "comedy", "thriller", "horror"],
            "roles": ["lead", "supporting", "character", "villain", "comic"],
            "production_houses": ["yrf", "dharma", "red chillies", "t-series", "eros"],
            "languages": ["hindi", "english", "marathi", "gujarati", "punjabi", "tamil", "telugu"]
        }
    
    async def extract_profile_features(
        self,
        talent_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract comprehensive features from talent profile.
        
        Args:
            talent_profile: Complete talent profile data
            
        Returns:
            Extracted features dictionary
        """
        try:
            features = {
                "text_features": self._extract_text_features(talent_profile),
                "skill_features": self._extract_skill_features(talent_profile),
                "attribute_features": self._extract_attribute_features(talent_profile),
                "experience_features": self._extract_experience_features(talent_profile),
                "metadata": self._extract_metadata(talent_profile)
            }
            
            # Add industry-specific features
            features["industry_features"] = self._extract_industry_features(talent_profile)
            
            logger.info(f"Extracted features for talent: {talent_profile.get('name', 'Unknown')}")
            return features
            
        except Exception as e:
            logger.error(f"Failed to extract profile features: {e}")
            raise
    
    async def generate_text_embedding(
        self,
        description: str,
        use_openai: bool = True
    ) -> List[float]:
        """
        Generate text embedding from description.
        
        Args:
            description: Text description to embed
            use_openai: Whether to use OpenAI embeddings
            
        Returns:
            Text embedding vector
        """
        try:
            if use_openai and self.openai_client:
                # Use OpenAI embeddings
                response = self.openai_client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=description
                )
                embedding = response.data[0].embedding
                logger.debug(f"Generated OpenAI embedding of dimension {len(embedding)}")
                return embedding
            else:
                # Fallback to sentence-transformers
                embedding = self.sentence_model.encode(description).tolist()
                # Pad to match OpenAI dimension
                if len(embedding) < self.text_dim:
                    padding = [0.0] * (self.text_dim - len(embedding))
                    embedding.extend(padding)
                logger.debug(f"Generated sentence-transformer embedding of dimension {len(embedding)}")
                return embedding[:self.text_dim]
                
        except Exception as e:
            logger.error(f"Failed to generate text embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * self.text_dim
    
    async def create_skill_vector(
        self,
        skills_list: List[str]
    ) -> List[float]:
        """
        Create skill-based embedding vector.
        
        Args:
            skills_list: List of skills
            
        Returns:
            Skill embedding vector
        """
        try:
            if not skills_list:
                return [0.0] * self.skill_dim
            
            # Combine skills into text
            skills_text = " ".join(skills_list)
            
            # Generate embedding
            skill_embedding = self.sentence_model.encode(skills_text)
            
            # Normalize
            norm = np.linalg.norm(skill_embedding)
            if norm > 0:
                skill_embedding = skill_embedding / norm
            
            return skill_embedding.tolist()
            
        except Exception as e:
            logger.error(f"Failed to create skill vector: {e}")
            return [0.0] * self.skill_dim
    
    async def encode_visual_features(
        self,
        headshots: List[str]
    ) -> Optional[List[float]]:
        """
        Encode visual features from headshots (placeholder for future implementation).
        
        Args:
            headshots: List of headshot URLs or base64 strings
            
        Returns:
            Visual feature vector
        """
        try:
            # Placeholder for visual feature extraction
            # In production, this would use a vision model like CLIP
            logger.debug("Visual feature encoding not yet implemented")
            return None
            
        except Exception as e:
            logger.error(f"Failed to encode visual features: {e}")
            return None
    
    async def combine_embeddings(
        self,
        text_embedding: List[float],
        skill_embedding: List[float],
        visual_embedding: Optional[List[float]] = None
    ) -> List[float]:
        """
        Combine multiple embeddings into a single vector.
        
        Args:
            text_embedding: Text-based embedding
            skill_embedding: Skill-based embedding
            visual_embedding: Visual embedding (optional)
            
        Returns:
            Combined embedding vector
        """
        try:
            # For now, we'll use text embedding as the primary vector
            # In a more advanced implementation, we could concatenate or blend
            
            # Ensure consistent dimension
            if len(text_embedding) != self.text_dim:
                logger.warning(f"Text embedding dimension mismatch: {len(text_embedding)} != {self.text_dim}")
                text_embedding = self._resize_embedding(text_embedding, self.text_dim)
            
            # Normalize the embedding
            normalized = await self.normalize_vectors(text_embedding)
            
            return normalized
            
        except Exception as e:
            logger.error(f"Failed to combine embeddings: {e}")
            return text_embedding
    
    async def normalize_vectors(
        self,
        embeddings: List[float]
    ) -> List[float]:
        """
        Normalize embedding vectors for consistent similarity computation.
        
        Args:
            embeddings: Raw embedding vectors
            
        Returns:
            Normalized vectors
        """
        try:
            # Convert to numpy for easier computation
            vec = np.array(embeddings)
            
            # L2 normalization
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            
            return vec.tolist()
            
        except Exception as e:
            logger.error(f"Failed to normalize vectors: {e}")
            return embeddings
    
    async def generate_profile_embedding(
        self,
        talent_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate complete embedding for talent profile.
        
        Args:
            talent_profile: Complete talent profile
            
        Returns:
            Embedding data with metadata
        """
        try:
            # Extract features
            features = await self.extract_profile_features(talent_profile)
            
            # Generate text embedding
            text_content = self._create_embedding_text(talent_profile, features)
            text_embedding = await self.generate_text_embedding(text_content)
            
            # Generate skill embedding
            skills = talent_profile.get("skills", [])
            skill_embedding = await self.create_skill_vector(skills)
            
            # Combine embeddings
            final_embedding = await self.combine_embeddings(
                text_embedding,
                skill_embedding
            )
            
            # Prepare result
            result = {
                "talent_id": talent_profile.get("id", self._generate_id(talent_profile)),
                "embedding": final_embedding,
                "embedding_dimension": len(final_embedding),
                "metadata": {
                    "name": talent_profile.get("name", ""),
                    "age": talent_profile.get("age", 0),
                    "gender": talent_profile.get("gender", ""),
                    "location": talent_profile.get("location", ""),
                    "languages": talent_profile.get("languages", []),
                    "skills": skills,
                    "experience_years": talent_profile.get("experience_years", 0),
                    "last_updated": datetime.utcnow().isoformat()
                },
                "features": features,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Generated complete embedding for talent: {result['talent_id']}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to generate profile embedding: {e}")
            raise
    
    async def batch_generate_embeddings(
        self,
        profiles: List[Dict[str, Any]],
        batch_size: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Generate embeddings for multiple profiles in batches.
        
        Args:
            profiles: List of talent profiles
            batch_size: Number of profiles to process in parallel
            
        Returns:
            List of embedding results
        """
        try:
            results = []
            
            for i in range(0, len(profiles), batch_size):
                batch = profiles[i:i + batch_size]
                
                # Process batch in parallel
                tasks = [
                    self.generate_profile_embedding(profile)
                    for profile in batch
                ]
                
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Filter out errors
                for result in batch_results:
                    if isinstance(result, Exception):
                        logger.error(f"Batch embedding error: {result}")
                    else:
                        results.append(result)
                
                logger.info(f"Processed batch {i//batch_size + 1}: {len(batch)} profiles")
            
            return results
            
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {e}")
            return []
    
    # Helper methods
    
    def _extract_text_features(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract text-based features from profile."""
        return {
            "biography": profile.get("biography", ""),
            "description": profile.get("description", ""),
            "achievements": profile.get("achievements", ""),
            "training": profile.get("training", "")
        }
    
    def _extract_skill_features(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract skill-based features."""
        skills = profile.get("skills", [])
        specializations = profile.get("specializations", [])
        
        return {
            "primary_skills": skills[:5] if skills else [],
            "all_skills": skills,
            "specializations": specializations,
            "skill_count": len(skills)
        }
    
    def _extract_attribute_features(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract physical and demographic attributes."""
        return {
            "age": profile.get("age", 0),
            "gender": profile.get("gender", ""),
            "height": profile.get("height", ""),
            "weight": profile.get("weight", ""),
            "eye_color": profile.get("eye_color", ""),
            "hair_color": profile.get("hair_color", ""),
            "ethnicity": profile.get("ethnicity", ""),
            "location": profile.get("location", "")
        }
    
    def _extract_experience_features(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract experience-related features."""
        return {
            "experience_years": profile.get("experience_years", 0),
            "past_roles": profile.get("past_roles", []),
            "genres": profile.get("genres", []),
            "notable_works": profile.get("notable_works", []),
            "awards": profile.get("awards", []),
            "production_houses": profile.get("production_houses", [])
        }
    
    def _extract_metadata(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract metadata for search and filtering."""
        return {
            "profile_id": profile.get("id", ""),
            "created_at": profile.get("created_at", ""),
            "updated_at": profile.get("updated_at", ""),
            "status": profile.get("status", "active"),
            "availability": profile.get("availability", "available"),
            "budget_range": profile.get("budget_range", {}),
            "union_member": profile.get("union_member", False)
        }
    
    def _extract_industry_features(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract Mumbai film industry specific features."""
        features = {
            "is_star_kid": profile.get("is_star_kid", False),
            "film_school": profile.get("film_school", ""),
            "industry_connections": profile.get("industry_connections", []),
            "preferred_genres": profile.get("preferred_genres", []),
            "language_fluency": {}
        }
        
        # Assess language fluency
        languages = profile.get("languages", [])
        for lang in languages:
            if isinstance(lang, dict):
                features["language_fluency"][lang.get("language", "")] = lang.get("fluency", "basic")
            else:
                features["language_fluency"][lang] = "fluent"
        
        return features
    
    def _create_embedding_text(
        self,
        profile: Dict[str, Any],
        features: Dict[str, Any]
    ) -> str:
        """Create comprehensive text for embedding."""
        parts = []
        
        # Name and basic info
        if profile.get("name"):
            parts.append(f"Name: {profile['name']}")
        
        # Biography
        if features["text_features"]["biography"]:
            parts.append(f"Biography: {features['text_features']['biography']}")
        
        # Skills
        if features["skill_features"]["all_skills"]:
            skills_str = ", ".join(features["skill_features"]["all_skills"])
            parts.append(f"Skills: {skills_str}")
        
        # Experience
        exp_features = features["experience_features"]
        if exp_features["experience_years"]:
            parts.append(f"Experience: {exp_features['experience_years']} years")
        
        if exp_features["genres"]:
            genres_str = ", ".join(exp_features["genres"])
            parts.append(f"Genres: {genres_str}")
        
        # Languages
        if features["industry_features"]["language_fluency"]:
            lang_str = ", ".join(features["industry_features"]["language_fluency"].keys())
            parts.append(f"Languages: {lang_str}")
        
        # Physical attributes
        attr_features = features["attribute_features"]
        if attr_features["age"]:
            parts.append(f"Age: {attr_features['age']}")
        if attr_features["height"]:
            parts.append(f"Height: {attr_features['height']}")
        
        # Industry specific
        if features["industry_features"]["film_school"]:
            parts.append(f"Training: {features['industry_features']['film_school']}")
        
        return " | ".join(parts)
    
    def _generate_id(self, profile: Dict[str, Any]) -> str:
        """Generate unique ID for profile."""
        content = json.dumps(profile, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _resize_embedding(self, embedding: List[float], target_dim: int) -> List[float]:
        """Resize embedding to target dimension."""
        current_dim = len(embedding)
        
        if current_dim == target_dim:
            return embedding
        elif current_dim < target_dim:
            # Pad with zeros
            padding = [0.0] * (target_dim - current_dim)
            return embedding + padding
        else:
            # Truncate
            return embedding[:target_dim]
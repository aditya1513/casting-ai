"""Pinecone vector database integration for semantic search."""

import os
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np
from pinecone import Pinecone, ServerlessSpec, Index
from loguru import logger
import hashlib
import json

from app.core.config import settings


class PineconeSearchSystem:
    """Advanced Pinecone vector search system for talent discovery."""
    
    def __init__(self):
        """Initialize Pinecone client and index."""
        self.pc = None
        self.index = None
        self.index_name = settings.pinecone_index_name or "castmatch-talent"
        self.dimension = 1536  # OpenAI ada-002 embedding dimension
        self.metric = "cosine"
        self.cloud = "aws"
        self.region = "us-east-1"
        
        # Performance settings
        self.batch_size = 100
        self.max_retries = 3
        self.retry_delay = 1.0
        
        # Caching
        self.cache_ttl = 300  # 5 minutes
        self.query_cache = {}
        
        self._initialize_pinecone()
    
    def _initialize_pinecone(self):
        """Initialize Pinecone connection and create index if needed."""
        try:
            # Initialize Pinecone
            self.pc = Pinecone(api_key=settings.pinecone_api_key)
            
            # Check if index exists
            existing_indexes = self.pc.list_indexes()
            
            if self.index_name not in [idx.name for idx in existing_indexes]:
                logger.info(f"Creating new Pinecone index: {self.index_name}")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric=self.metric,
                    spec=ServerlessSpec(
                        cloud=self.cloud,
                        region=self.region
                    )
                )
                # Wait for index to be ready
                time.sleep(5)
            
            # Connect to index
            self.index = self.pc.Index(self.index_name)
            
            # Get index stats
            stats = self.index.describe_index_stats()
            logger.info(f"Connected to Pinecone index: {self.index_name}")
            logger.info(f"Index stats - Total vectors: {stats.total_vector_count}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone: {e}")
            raise
    
    async def initialize_index(
        self, 
        dimension: int = 1536, 
        metric: str = "cosine"
    ) -> bool:
        """
        Initialize or recreate index with specified configuration.
        
        Args:
            dimension: Vector dimension
            metric: Distance metric (cosine, euclidean, dotproduct)
            
        Returns:
            Success status
        """
        try:
            self.dimension = dimension
            self.metric = metric
            
            # Delete existing index if dimensions changed
            if self.index_name in [idx.name for idx in self.pc.list_indexes()]:
                current_config = self.pc.describe_index(self.index_name)
                if current_config.dimension != dimension:
                    logger.warning(f"Deleting index {self.index_name} due to dimension change")
                    self.pc.delete_index(self.index_name)
                    time.sleep(5)
            
            # Recreate index
            self._initialize_pinecone()
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize index: {e}")
            return False
    
    async def create_talent_embeddings(
        self,
        profile_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create comprehensive embeddings for talent profile.
        
        Args:
            profile_data: Talent profile data
            
        Returns:
            Embedding data with metadata
        """
        try:
            # Generate unique ID
            talent_id = profile_data.get("id") or self._generate_id(profile_data)
            
            # Prepare text for embedding
            embedding_text = self._prepare_embedding_text(profile_data)
            
            # Create metadata
            metadata = self._prepare_metadata(profile_data)
            
            return {
                "id": talent_id,
                "text": embedding_text,
                "metadata": metadata,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create talent embeddings: {e}")
            raise
    
    async def upsert_talent_vectors(
        self,
        embeddings: List[float],
        metadata: Dict[str, Any],
        talent_id: str
    ) -> bool:
        """
        Upsert talent vectors to Pinecone.
        
        Args:
            embeddings: Vector embeddings
            metadata: Associated metadata
            talent_id: Unique talent identifier
            
        Returns:
            Success status
        """
        try:
            # Prepare vector data
            vectors = [
                {
                    "id": talent_id,
                    "values": embeddings,
                    "metadata": metadata
                }
            ]
            
            # Upsert with retry
            for attempt in range(self.max_retries):
                try:
                    response = self.index.upsert(vectors=vectors)
                    logger.info(f"Upserted vector for talent {talent_id}: {response}")
                    return True
                except Exception as e:
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to upsert vectors: {e}")
            return False
    
    async def hybrid_search(
        self,
        query_embedding: List[float],
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 20,
        include_metadata: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining vector similarity and metadata filters.
        
        Args:
            query_embedding: Query vector
            filters: Metadata filters
            top_k: Number of results to return
            include_metadata: Include metadata in results
            
        Returns:
            Search results with scores
        """
        try:
            # Check cache
            cache_key = self._get_cache_key(query_embedding, filters, top_k)
            if cache_key in self.query_cache:
                cached_result, cached_time = self.query_cache[cache_key]
                if time.time() - cached_time < self.cache_ttl:
                    logger.debug("Returning cached search results")
                    return cached_result
            
            # Prepare filter
            pinecone_filter = self._prepare_filter(filters) if filters else None
            
            # Perform search
            results = self.index.query(
                vector=query_embedding,
                filter=pinecone_filter,
                top_k=top_k,
                include_metadata=include_metadata
            )
            
            # Format results
            formatted_results = []
            for match in results.matches:
                result = {
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata if include_metadata else None
                }
                formatted_results.append(result)
            
            # Cache results
            self.query_cache[cache_key] = (formatted_results, time.time())
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            return []
    
    async def update_vectors_realtime(
        self,
        changes: List[Dict[str, Any]]
    ) -> bool:
        """
        Update vectors in real-time based on profile changes.
        
        Args:
            changes: List of profile changes
            
        Returns:
            Success status
        """
        try:
            vectors_to_update = []
            
            for change in changes:
                talent_id = change.get("talent_id")
                if not talent_id:
                    continue
                
                # Prepare updated vector
                if "embedding" in change:
                    vector_data = {
                        "id": talent_id,
                        "values": change["embedding"]
                    }
                    
                    # Update metadata if provided
                    if "metadata" in change:
                        vector_data["metadata"] = change["metadata"]
                    
                    vectors_to_update.append(vector_data)
            
            # Batch update
            if vectors_to_update:
                for i in range(0, len(vectors_to_update), self.batch_size):
                    batch = vectors_to_update[i:i + self.batch_size]
                    self.index.upsert(vectors=batch)
                    logger.info(f"Updated {len(batch)} vectors in real-time")
            
            return True
            
        except Exception as e:
            logger.error(f"Real-time update failed: {e}")
            return False
    
    async def delete_stale_vectors(
        self,
        criteria: Dict[str, Any]
    ) -> int:
        """
        Delete stale or inactive vectors based on criteria.
        
        Args:
            criteria: Deletion criteria (e.g., last_updated, status)
            
        Returns:
            Number of vectors deleted
        """
        try:
            # Build filter for stale vectors
            filter_dict = {}
            
            if "inactive_days" in criteria:
                cutoff_date = datetime.utcnow().timestamp() - (criteria["inactive_days"] * 86400)
                filter_dict["last_updated"] = {"$lt": cutoff_date}
            
            if "status" in criteria:
                filter_dict["status"] = criteria["status"]
            
            # Query to find vectors to delete
            results = self.index.query(
                vector=[0] * self.dimension,  # Dummy vector
                filter=filter_dict,
                top_k=10000,
                include_metadata=False
            )
            
            # Delete vectors
            if results.matches:
                ids_to_delete = [match.id for match in results.matches]
                self.index.delete(ids=ids_to_delete)
                logger.info(f"Deleted {len(ids_to_delete)} stale vectors")
                return len(ids_to_delete)
            
            return 0
            
        except Exception as e:
            logger.error(f"Failed to delete stale vectors: {e}")
            return 0
    
    async def get_index_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive index statistics.
        
        Returns:
            Index statistics
        """
        try:
            stats = self.index.describe_index_stats()
            return {
                "total_vectors": stats.total_vector_count,
                "dimension": stats.dimension,
                "index_fullness": stats.index_fullness,
                "namespaces": stats.namespaces
            }
        except Exception as e:
            logger.error(f"Failed to get index stats: {e}")
            return {}
    
    async def batch_upsert(
        self,
        vectors_data: List[Dict[str, Any]]
    ) -> bool:
        """
        Batch upsert multiple vectors efficiently.
        
        Args:
            vectors_data: List of vector data with embeddings and metadata
            
        Returns:
            Success status
        """
        try:
            total_vectors = len(vectors_data)
            successful_upserts = 0
            
            for i in range(0, total_vectors, self.batch_size):
                batch = vectors_data[i:i + self.batch_size]
                
                # Prepare vectors for upsert
                vectors = []
                for data in batch:
                    vector = {
                        "id": data["id"],
                        "values": data["embedding"],
                        "metadata": data.get("metadata", {})
                    }
                    vectors.append(vector)
                
                # Upsert batch
                try:
                    self.index.upsert(vectors=vectors)
                    successful_upserts += len(vectors)
                    logger.info(f"Upserted batch {i//self.batch_size + 1}: {len(vectors)} vectors")
                except Exception as e:
                    logger.error(f"Batch upsert failed: {e}")
            
            logger.info(f"Successfully upserted {successful_upserts}/{total_vectors} vectors")
            return successful_upserts == total_vectors
            
        except Exception as e:
            logger.error(f"Batch upsert failed: {e}")
            return False
    
    async def similarity_search(
        self,
        talent_id: str,
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find similar talents based on a reference talent.
        
        Args:
            talent_id: Reference talent ID
            top_k: Number of similar talents to return
            
        Returns:
            List of similar talents
        """
        try:
            # Fetch the reference vector
            result = self.index.fetch(ids=[talent_id])
            
            if talent_id not in result.vectors:
                logger.warning(f"Talent {talent_id} not found in index")
                return []
            
            reference_vector = result.vectors[talent_id].values
            
            # Search for similar vectors
            similar = await self.hybrid_search(
                query_embedding=reference_vector,
                top_k=top_k + 1,  # +1 to exclude self
                include_metadata=True
            )
            
            # Remove self from results
            similar = [s for s in similar if s["id"] != talent_id][:top_k]
            
            return similar
            
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            return []
    
    # Helper methods
    
    def _generate_id(self, data: Dict[str, Any]) -> str:
        """Generate unique ID for talent."""
        content = json.dumps(data, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _prepare_embedding_text(self, profile: Dict[str, Any]) -> str:
        """Prepare text for embedding from profile data."""
        parts = []
        
        # Core information
        if profile.get("name"):
            parts.append(f"Name: {profile['name']}")
        
        if profile.get("biography"):
            parts.append(f"Biography: {profile['biography']}")
        
        # Skills and specializations
        if profile.get("skills"):
            skills = ", ".join(profile["skills"]) if isinstance(profile["skills"], list) else profile["skills"]
            parts.append(f"Skills: {skills}")
        
        # Experience
        if profile.get("experience"):
            parts.append(f"Experience: {profile['experience']}")
        
        # Languages
        if profile.get("languages"):
            languages = ", ".join(profile["languages"]) if isinstance(profile["languages"], list) else profile["languages"]
            parts.append(f"Languages: {languages}")
        
        # Physical attributes
        if profile.get("physical_attributes"):
            attrs = profile["physical_attributes"]
            attr_str = ", ".join([f"{k}: {v}" for k, v in attrs.items()])
            parts.append(f"Physical: {attr_str}")
        
        # Past roles
        if profile.get("past_roles"):
            roles = ", ".join(profile["past_roles"]) if isinstance(profile["past_roles"], list) else profile["past_roles"]
            parts.append(f"Past roles: {roles}")
        
        return " | ".join(parts)
    
    def _prepare_metadata(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare metadata for Pinecone storage."""
        metadata = {
            "name": profile.get("name", ""),
            "age": profile.get("age", 0),
            "gender": profile.get("gender", ""),
            "location": profile.get("location", ""),
            "status": profile.get("status", "active"),
            "last_updated": datetime.utcnow().timestamp()
        }
        
        # Add searchable fields
        if profile.get("skills"):
            metadata["skills"] = ", ".join(profile["skills"]) if isinstance(profile["skills"], list) else profile["skills"]
        
        if profile.get("languages"):
            metadata["languages"] = ", ".join(profile["languages"]) if isinstance(profile["languages"], list) else profile["languages"]
        
        if profile.get("height"):
            metadata["height"] = profile["height"]
        
        if profile.get("budget_range"):
            metadata["budget_min"] = profile["budget_range"].get("min", 0)
            metadata["budget_max"] = profile["budget_range"].get("max", 0)
        
        return metadata
    
    def _prepare_filter(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Convert filters to Pinecone format."""
        pinecone_filter = {}
        
        for key, value in filters.items():
            if isinstance(value, dict):
                # Range filters
                if "min" in value or "max" in value:
                    pinecone_filter[key] = {}
                    if "min" in value:
                        pinecone_filter[key]["$gte"] = value["min"]
                    if "max" in value:
                        pinecone_filter[key]["$lte"] = value["max"]
                else:
                    pinecone_filter[key] = value
            elif isinstance(value, list):
                # In filters
                pinecone_filter[key] = {"$in": value}
            else:
                # Exact match
                pinecone_filter[key] = value
        
        return pinecone_filter
    
    def _get_cache_key(
        self,
        embedding: List[float],
        filters: Optional[Dict],
        top_k: int
    ) -> str:
        """Generate cache key for query."""
        # Use first few dimensions of embedding for cache key
        embedding_summary = str(embedding[:5]) if embedding else ""
        filter_str = json.dumps(filters, sort_keys=True) if filters else ""
        cache_content = f"{embedding_summary}:{filter_str}:{top_k}"
        return hashlib.md5(cache_content.encode()).hexdigest()
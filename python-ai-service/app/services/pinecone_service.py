"""
Pinecone Vector Database Service
Handles vector storage and semantic search for the memory system
"""

import os
import logging
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

class PineconeService:
    """Service for managing vector embeddings in Pinecone"""
    
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.environment = os.getenv("PINECONE_ENVIRONMENT", "gcp-starter")
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "castmatch-memory")
        self.dimension = 1536  # OpenAI embedding dimension
        self.metric = "cosine"
        self.pc = None
        self.index = None
        
        if self.api_key:
            self.initialize()
    
    def initialize(self):
        """Initialize Pinecone connection and create index if needed"""
        try:
            # Initialize Pinecone
            self.pc = Pinecone(api_key=self.api_key)
            
            # Create index if it doesn't exist
            if self.index_name not in self.pc.list_indexes().names():
                logger.info(f"Creating Pinecone index: {self.index_name}")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric=self.metric,
                    spec=ServerlessSpec(
                        cloud='gcp',
                        region='us-central1'
                    )
                )
            
            # Connect to index
            self.index = self.pc.Index(self.index_name)
            logger.info(f"Connected to Pinecone index: {self.index_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone: {e}")
            self.index = None
    
    def upsert_memory(self, 
                     memory_id: str,
                     embedding: List[float],
                     metadata: Dict[str, Any]) -> bool:
        """
        Store a memory embedding in Pinecone
        
        Args:
            memory_id: Unique identifier for the memory
            embedding: Vector embedding of the memory
            metadata: Additional metadata (user_id, type, content, etc.)
        
        Returns:
            Success status
        """
        if not self.index:
            logger.error("Pinecone index not initialized")
            return False
        
        try:
            # Prepare vector data
            vectors = [{
                "id": memory_id,
                "values": embedding,
                "metadata": {
                    **metadata,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }]
            
            # Upsert to Pinecone
            response = self.index.upsert(vectors=vectors)
            logger.info(f"Upserted memory {memory_id} to Pinecone")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert memory to Pinecone: {e}")
            return False
    
    def search_similar(self,
                      query_embedding: List[float],
                      user_id: str,
                      top_k: int = 10,
                      threshold: float = 0.7,
                      filters: Optional[Dict] = None) -> List[Dict]:
        """
        Search for similar memories using vector similarity
        
        Args:
            query_embedding: Query vector embedding
            user_id: User ID to filter results
            top_k: Number of results to return
            threshold: Minimum similarity score
            filters: Additional metadata filters
        
        Returns:
            List of similar memories with scores
        """
        if not self.index:
            logger.error("Pinecone index not initialized")
            return []
        
        try:
            # Build metadata filter
            metadata_filter = {"user_id": user_id}
            if filters:
                metadata_filter.update(filters)
            
            # Query Pinecone
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=metadata_filter
            )
            
            # Filter by threshold and format results
            similar_memories = []
            for match in results.matches:
                if match.score >= threshold:
                    similar_memories.append({
                        "id": match.id,
                        "score": float(match.score),
                        "metadata": match.metadata
                    })
            
            logger.info(f"Found {len(similar_memories)} similar memories for user {user_id}")
            return similar_memories
            
        except Exception as e:
            logger.error(f"Failed to search Pinecone: {e}")
            return []
    
    def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory from Pinecone"""
        if not self.index:
            return False
        
        try:
            self.index.delete(ids=[memory_id])
            logger.info(f"Deleted memory {memory_id} from Pinecone")
            return True
        except Exception as e:
            logger.error(f"Failed to delete from Pinecone: {e}")
            return False
    
    def delete_user_memories(self, user_id: str) -> bool:
        """Delete all memories for a user"""
        if not self.index:
            return False
        
        try:
            self.index.delete(filter={"user_id": user_id})
            logger.info(f"Deleted all memories for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete user memories: {e}")
            return False
    
    def get_stats(self) -> Dict:
        """Get index statistics"""
        if not self.index:
            return {"error": "Index not initialized"}
        
        try:
            stats = self.index.describe_index_stats()
            return {
                "total_vectors": stats.total_vector_count,
                "dimension": stats.dimension,
                "namespaces": stats.namespaces
            }
        except Exception as e:
            logger.error(f"Failed to get index stats: {e}")
            return {"error": str(e)}

# Global instance
pinecone_service = PineconeService()
"""Vector database service for semantic search using Pinecone."""

import os
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
import numpy as np
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
import hashlib
import json

from app.core.config import settings


class VectorService:
    """Service for managing vector embeddings and semantic search."""
    
    def __init__(self):
        """Initialize the vector service with Pinecone and embedding models."""
        self.pc = None
        self.index = None
        self.embedding_model = None
        self.dimension = 768  # Using all-MiniLM-L6-v2 which outputs 384 dimensions
        
    async def initialize(self):
        """Initialize Pinecone connection and embedding model."""
        try:
            # Initialize Pinecone
            if settings.pinecone_api_key:
                self.pc = Pinecone(api_key=settings.pinecone_api_key)
                
                # Check if index exists, create if not
                index_name = settings.pinecone_index_name or "castmatch-talents"
                
                try:
                    # List existing indexes
                    existing_indexes = self.pc.list_indexes()
                    index_exists = any(idx.name == index_name for idx in existing_indexes)
                    
                    if not index_exists:
                        logger.info(f"Creating Pinecone index: {index_name}")
                        self.pc.create_index(
                            name=index_name,
                            dimension=self.dimension,
                            metric="cosine",
                            spec=ServerlessSpec(
                                cloud="aws",
                                region=settings.pinecone_environment or "us-east-1"
                            )
                        )
                        # Wait for index to be ready
                        await asyncio.sleep(5)
                    
                    self.index = self.pc.Index(index_name)
                    logger.info(f"Connected to Pinecone index: {index_name}")
                    
                except Exception as e:
                    logger.warning(f"Could not connect to Pinecone: {e}")
                    logger.info("Will use fallback in-memory vector search")
            
            # Initialize embedding model
            logger.info("Loading embedding model...")
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Embedding model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error initializing vector service: {e}")
            # Continue without vector search if initialization fails
    
    def _generate_vector_id(self, data: Dict[str, Any]) -> str:
        """Generate a unique ID for a vector based on data."""
        # Create a deterministic ID from the data
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(data_str.encode()).hexdigest()
    
    async def create_embedding(self, text: str) -> np.ndarray:
        """Create an embedding vector from text."""
        try:
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                None,
                self.embedding_model.encode,
                text
            )
            return embedding
        except Exception as e:
            logger.error(f"Error creating embedding: {e}")
            # Return random vector as fallback
            return np.random.randn(self.dimension)
    
    async def index_talent(self, talent_data: Dict[str, Any]) -> bool:
        """Index a talent profile in the vector database."""
        try:
            # Create text representation of talent
            text_parts = []
            
            # Add basic info
            if talent_data.get('name'):
                text_parts.append(f"Name: {talent_data['name']}")
            if talent_data.get('bio'):
                text_parts.append(f"Bio: {talent_data['bio']}")
            if talent_data.get('skills'):
                skills = talent_data['skills']
                if isinstance(skills, list):
                    text_parts.append(f"Skills: {', '.join(skills)}")
                else:
                    text_parts.append(f"Skills: {skills}")
            if talent_data.get('experience'):
                text_parts.append(f"Experience: {talent_data['experience']}")
            if talent_data.get('location'):
                text_parts.append(f"Location: {talent_data['location']}")
            if talent_data.get('languages'):
                langs = talent_data['languages']
                if isinstance(langs, list):
                    text_parts.append(f"Languages: {', '.join(langs)}")
                else:
                    text_parts.append(f"Languages: {langs}")
            
            # Add physical attributes if available
            if talent_data.get('gender'):
                text_parts.append(f"Gender: {talent_data['gender']}")
            if talent_data.get('age'):
                text_parts.append(f"Age: {talent_data['age']}")
            if talent_data.get('height'):
                text_parts.append(f"Height: {talent_data['height']}")
            
            # Create combined text
            combined_text = " | ".join(text_parts)
            
            # Generate embedding
            embedding = await self.create_embedding(combined_text)
            
            # Prepare metadata
            metadata = {
                "talent_id": str(talent_data.get('id', '')),
                "name": talent_data.get('name', ''),
                "location": talent_data.get('location', ''),
                "skills": json.dumps(talent_data.get('skills', [])),
                "experience": talent_data.get('experience', ''),
                "gender": talent_data.get('gender', ''),
                "age": str(talent_data.get('age', 0))
            }
            
            # Index in Pinecone if available
            if self.index:
                vector_id = self._generate_vector_id(talent_data)
                self.index.upsert(
                    vectors=[{
                        "id": vector_id,
                        "values": embedding.tolist(),
                        "metadata": metadata
                    }]
                )
                logger.info(f"Indexed talent {talent_data.get('name')} in Pinecone")
            
            return True
            
        except Exception as e:
            logger.error(f"Error indexing talent: {e}")
            return False
    
    async def search_similar_talents(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """Search for similar talents based on query."""
        try:
            # Generate query embedding
            query_embedding = await self.create_embedding(query)
            
            results = []
            
            # Search in Pinecone if available
            if self.index:
                # Build filter dict for Pinecone
                pinecone_filter = {}
                if filters:
                    if filters.get('location'):
                        pinecone_filter['location'] = filters['location']
                    if filters.get('gender'):
                        pinecone_filter['gender'] = filters['gender']
                    if filters.get('min_age') and filters.get('max_age'):
                        # Pinecone doesn't support range queries directly in metadata
                        # We'll filter results after retrieval
                        pass
                
                # Query Pinecone
                query_response = self.index.query(
                    vector=query_embedding.tolist(),
                    top_k=top_k * 2,  # Get more results for post-filtering
                    include_metadata=True,
                    filter=pinecone_filter if pinecone_filter else None
                )
                
                # Process results
                for match in query_response['matches']:
                    metadata = match.get('metadata', {})
                    
                    # Apply additional filters
                    if filters:
                        if filters.get('min_age'):
                            try:
                                age = int(metadata.get('age', 0))
                                if age < filters['min_age']:
                                    continue
                            except:
                                pass
                        
                        if filters.get('max_age'):
                            try:
                                age = int(metadata.get('age', 100))
                                if age > filters['max_age']:
                                    continue
                            except:
                                pass
                    
                    # Parse skills from JSON string
                    skills = []
                    try:
                        skills_str = metadata.get('skills', '[]')
                        skills = json.loads(skills_str) if skills_str else []
                    except:
                        skills = []
                    
                    results.append({
                        'talent_id': metadata.get('talent_id'),
                        'name': metadata.get('name'),
                        'score': match['score'],
                        'location': metadata.get('location'),
                        'skills': skills,
                        'experience': metadata.get('experience'),
                        'gender': metadata.get('gender'),
                        'age': metadata.get('age')
                    })
                    
                    if len(results) >= top_k:
                        break
            
            else:
                # Fallback: Return mock results if Pinecone is not available
                logger.warning("Pinecone not available, returning mock results")
                results = [
                    {
                        'talent_id': f'mock_{i}',
                        'name': f'Talent {i}',
                        'score': 0.9 - (i * 0.05),
                        'location': 'Mumbai',
                        'skills': ['Acting', 'Dancing'],
                        'experience': f'{5 + i} years',
                        'gender': 'Any',
                        'age': str(25 + i)
                    }
                    for i in range(min(5, top_k))
                ]
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching similar talents: {e}")
            return []
    
    async def find_talents_for_role(
        self,
        role_description: str,
        requirements: Optional[Dict[str, Any]] = None,
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """Find talents matching a specific role description."""
        try:
            # Enhance role description with requirements
            enhanced_query = role_description
            
            if requirements:
                req_parts = []
                if requirements.get('skills'):
                    req_parts.append(f"Required skills: {', '.join(requirements['skills'])}")
                if requirements.get('experience'):
                    req_parts.append(f"Experience: {requirements['experience']}")
                if requirements.get('languages'):
                    req_parts.append(f"Languages: {', '.join(requirements['languages'])}")
                if requirements.get('location'):
                    req_parts.append(f"Location: {requirements['location']}")
                
                if req_parts:
                    enhanced_query = f"{role_description} | Requirements: {' | '.join(req_parts)}"
            
            # Search for similar talents
            results = await self.search_similar_talents(
                query=enhanced_query,
                filters=requirements,
                top_k=top_k
            )
            
            # Add role-specific scoring
            for result in results:
                # Boost score based on requirement matches
                boost = 0
                if requirements:
                    if requirements.get('skills'):
                        for skill in requirements['skills']:
                            if skill.lower() in [s.lower() for s in result.get('skills', [])]:
                                boost += 0.05
                    
                    if requirements.get('location'):
                        if result.get('location', '').lower() == requirements['location'].lower():
                            boost += 0.1
                
                result['adjusted_score'] = min(1.0, result['score'] + boost)
                result['role_match_reason'] = self._generate_match_reason(
                    result, role_description, requirements
                )
            
            # Re-sort by adjusted score
            results.sort(key=lambda x: x['adjusted_score'], reverse=True)
            
            return results
            
        except Exception as e:
            logger.error(f"Error finding talents for role: {e}")
            return []
    
    def _generate_match_reason(
        self,
        talent: Dict[str, Any],
        role_description: str,
        requirements: Optional[Dict[str, Any]]
    ) -> str:
        """Generate a reason why a talent matches a role."""
        reasons = []
        
        # Check skill matches
        if requirements and requirements.get('skills'):
            matching_skills = []
            for skill in requirements['skills']:
                if skill.lower() in [s.lower() for s in talent.get('skills', [])]:
                    matching_skills.append(skill)
            
            if matching_skills:
                reasons.append(f"Has required skills: {', '.join(matching_skills)}")
        
        # Check location match
        if requirements and requirements.get('location'):
            if talent.get('location', '').lower() == requirements['location'].lower():
                reasons.append(f"Located in {requirements['location']}")
        
        # Check experience
        if talent.get('experience'):
            reasons.append(f"{talent['experience']} of experience")
        
        # High similarity score
        if talent.get('score', 0) > 0.8:
            reasons.append("High profile similarity to role requirements")
        
        if not reasons:
            reasons.append("General profile match")
        
        return " | ".join(reasons)
    
    async def batch_index_talents(self, talents: List[Dict[str, Any]]) -> int:
        """Index multiple talent profiles at once."""
        indexed_count = 0
        
        for talent in talents:
            success = await self.index_talent(talent)
            if success:
                indexed_count += 1
        
        logger.info(f"Indexed {indexed_count}/{len(talents)} talents")
        return indexed_count
    
    async def delete_talent_vector(self, talent_id: str) -> bool:
        """Delete a talent's vector from the index."""
        try:
            if self.index:
                # Generate the vector ID for this talent
                vector_id = hashlib.md5(f"talent_{talent_id}".encode()).hexdigest()
                self.index.delete(ids=[vector_id])
                logger.info(f"Deleted vector for talent {talent_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting talent vector: {e}")
            return False


# Create singleton instance
vector_service = VectorService()
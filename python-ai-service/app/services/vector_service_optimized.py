"""Optimized vector database service with FAISS indexing and high-performance caching."""

import os
import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple, Union
from concurrent.futures import ThreadPoolExecutor
from loguru import logger
import numpy as np
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
import hashlib
import json
import faiss
import pickle
from pathlib import Path
import gc

from app.core.config import settings
from app.services.cache_service import cache_service


class OptimizedVectorService:
    """High-performance service for managing vector embeddings and semantic search."""
    
    def __init__(self):
        """Initialize the optimized vector service."""
        self.pc = None
        self.index = None
        self.embedding_model = None
        self.dimension = 384  # Using all-MiniLM-L6-v2 which outputs 384 dimensions
        
        # FAISS index for local vector search
        self.faiss_index: Optional[faiss.Index] = None
        self.talent_metadata: Dict[int, Dict[str, Any]] = {}  # Maps FAISS index to metadata
        self.faiss_id_counter = 0
        self.faiss_index_path = Path("faiss_index")
        
        # Performance optimizations
        self.executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="vector")
        self.model_loaded = False
        self.batch_size = 32  # For batch embedding processing
        
        # Performance metrics
        self.metrics = {
            'embedding_time': [],
            'search_time': [],
            'cache_hit_rate': 0.0,
            'total_vectors': 0
        }
        
    async def initialize(self):
        """Initialize optimized vector service with caching and FAISS."""
        try:
            # Initialize cache service first
            if not cache_service.initialized:
                await cache_service.initialize()
            
            # Initialize Pinecone (optional)
            if hasattr(settings, 'pinecone_api_key') and settings.pinecone_api_key:
                self.pc = Pinecone(api_key=settings.pinecone_api_key)
                
                # Check if index exists, create if not
                index_name = getattr(settings, 'pinecone_index_name', None) or "castmatch-talents"
                
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
                                region=getattr(settings, 'pinecone_environment', None) or "us-east-1"
                            )
                        )
                        # Wait for index to be ready
                        await asyncio.sleep(5)
                    
                    self.index = self.pc.Index(index_name)
                    logger.info(f"Connected to Pinecone index: {index_name}")
                    
                except Exception as e:
                    logger.warning(f"Could not connect to Pinecone: {e}")
                    logger.info("Will use FAISS local vector search")
            
            # Initialize FAISS index
            await self._initialize_faiss_index()
            
            # Initialize embedding model in thread pool
            logger.info("Loading optimized embedding model...")
            loop = asyncio.get_event_loop()
            self.embedding_model = await loop.run_in_executor(
                self.executor, 
                self._load_embedding_model
            )
            self.model_loaded = True
            logger.info("Embedding model loaded successfully with thread pool optimization")
            
        except Exception as e:
            logger.error(f"Error initializing vector service: {e}")
            # Continue without vector search if initialization fails
    
    def _load_embedding_model(self):
        """Load embedding model in thread pool."""
        return SentenceTransformer('all-MiniLM-L6-v2')
    
    async def _initialize_faiss_index(self):
        """Initialize or load FAISS index."""
        try:
            # Try to load existing FAISS index
            if self.faiss_index_path.exists():
                index_file = self.faiss_index_path / "index.faiss"
                metadata_file = self.faiss_index_path / "metadata.pkl"
                
                if index_file.exists() and metadata_file.exists():
                    logger.info("Loading existing FAISS index...")
                    self.faiss_index = faiss.read_index(str(index_file))
                    
                    with open(metadata_file, 'rb') as f:
                        data = pickle.load(f)
                        self.talent_metadata = data.get('metadata', {})
                        self.faiss_id_counter = data.get('counter', 0)
                    
                    self.metrics['total_vectors'] = self.faiss_index.ntotal
                    logger.info(f"Loaded FAISS index with {self.faiss_index.ntotal} vectors")
                    return
            
            # Create new FAISS index
            logger.info("Creating new FAISS index...")
            # Using HNSW (Hierarchical Navigable Small World) for better performance
            self.faiss_index = faiss.IndexHNSWFlat(self.dimension, 32)  # 32 connections
            self.faiss_index.hnsw.efConstruction = 40
            self.faiss_index.hnsw.efSearch = 16
            
            # Create index directory
            self.faiss_index_path.mkdir(exist_ok=True)
            logger.info("FAISS index initialized")
            
        except Exception as e:
            logger.error(f"Error initializing FAISS index: {e}")
            # Fallback to simple flat index
            self.faiss_index = faiss.IndexFlatIP(self.dimension)  # Inner product for cosine similarity
    
    def _generate_vector_id(self, data: Dict[str, Any]) -> str:
        """Generate a unique ID for a vector based on data."""
        # Create a deterministic ID from the data
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(data_str.encode()).hexdigest()
    
    async def create_embedding(self, text: str) -> np.ndarray:
        """Create an embedding vector from text with caching."""
        start_time = time.time()
        
        try:
            # Check cache first
            cached_embedding = await cache_service.get_embedding(text)
            if cached_embedding is not None:
                return cached_embedding
            
            # Generate new embedding
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                self.executor,
                self._create_embedding_sync,
                text
            )
            
            # Normalize for cosine similarity
            embedding = embedding / np.linalg.norm(embedding)
            
            # Cache the embedding
            await cache_service.set_embedding(text, embedding)
            
            # Update metrics
            self.metrics['embedding_time'].append(time.time() - start_time)
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error creating embedding: {e}")
            # Return random vector as fallback
            return np.random.randn(self.dimension) / np.sqrt(self.dimension)
    
    def _create_embedding_sync(self, text: str) -> np.ndarray:
        """Create embedding synchronously in thread pool."""
        return self.embedding_model.encode(text, normalize_embeddings=True)
    
    async def batch_create_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """Create embeddings for multiple texts with batch processing."""
        start_time = time.time()
        
        try:
            # Check cache for existing embeddings
            cached_embeddings = await cache_service.batch_get_embeddings(texts)
            
            # Identify texts that need new embeddings
            texts_to_embed = []
            results = [None] * len(texts)
            
            for i, text in enumerate(texts):
                cached = cached_embeddings.get(text)
                if cached is not None:
                    results[i] = cached
                else:
                    texts_to_embed.append((i, text))
            
            # Generate new embeddings in batches
            if texts_to_embed:
                batch_texts = [text for _, text in texts_to_embed]
                
                loop = asyncio.get_event_loop()
                new_embeddings = await loop.run_in_executor(
                    self.executor,
                    self._batch_create_embeddings_sync,
                    batch_texts
                )
                
                # Store results and cache new embeddings
                new_embeddings_dict = {}
                for (i, text), embedding in zip(texts_to_embed, new_embeddings):
                    results[i] = embedding
                    new_embeddings_dict[text] = embedding
                
                # Batch cache new embeddings
                if new_embeddings_dict:
                    await cache_service.batch_set_embeddings(new_embeddings_dict)
            
            # Update metrics
            self.metrics['embedding_time'].append(time.time() - start_time)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch embedding creation: {e}")
            # Return random vectors as fallback
            return [np.random.randn(self.dimension) / np.sqrt(self.dimension) for _ in texts]
    
    def _batch_create_embeddings_sync(self, texts: List[str]) -> List[np.ndarray]:
        """Create embeddings synchronously in thread pool with batching."""
        # Process texts in smaller batches to manage memory
        all_embeddings = []
        
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            embeddings = self.embedding_model.encode(batch, normalize_embeddings=True)
            all_embeddings.extend(embeddings)
            
            # Force garbage collection for large batches
            if i % (self.batch_size * 4) == 0:
                gc.collect()
        
        return all_embeddings
    
    async def index_talent(self, talent_data: Dict[str, Any]) -> bool:
        """Index a talent profile in the vector database with optimizations."""
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
            
            # Index in FAISS (faster local search)
            if self.faiss_index:
                faiss_id = self.faiss_id_counter
                self.faiss_index.add(embedding.reshape(1, -1))
                self.talent_metadata[faiss_id] = metadata
                self.faiss_id_counter += 1
                self.metrics['total_vectors'] += 1
                
                # Periodically save FAISS index
                if self.faiss_id_counter % 100 == 0:
                    await self._save_faiss_index()
            
            # Index in Pinecone if available (for distributed search)
            if self.index:
                vector_id = self._generate_vector_id(talent_data)
                self.index.upsert(
                    vectors=[{
                        "id": vector_id,
                        "values": embedding.tolist(),
                        "metadata": metadata
                    }]
                )
                logger.debug(f"Indexed talent {talent_data.get('name')} in Pinecone")
            
            logger.debug(f"Indexed talent {talent_data.get('name')} in FAISS (ID: {faiss_id})")
            return True
            
        except Exception as e:
            logger.error(f"Error indexing talent: {e}")
            return False
    
    async def _save_faiss_index(self):
        """Save FAISS index and metadata to disk."""
        try:
            if self.faiss_index and self.faiss_index_path:
                index_file = self.faiss_index_path / "index.faiss"
                metadata_file = self.faiss_index_path / "metadata.pkl"
                
                # Save FAISS index
                faiss.write_index(self.faiss_index, str(index_file))
                
                # Save metadata
                with open(metadata_file, 'wb') as f:
                    pickle.dump({
                        'metadata': self.talent_metadata,
                        'counter': self.faiss_id_counter
                    }, f)
                
                logger.debug(f"Saved FAISS index with {self.faiss_index.ntotal} vectors")
                
        except Exception as e:
            logger.error(f"Error saving FAISS index: {e}")
    
    async def search_similar_talents(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """Search for similar talents with optimized caching and FAISS."""
        start_time = time.time()
        
        try:
            # Check cache first
            cached_results = await cache_service.get_vector_search_results(query, filters)
            if cached_results is not None:
                return cached_results[:top_k]
            
            # Generate query embedding
            query_embedding = await self.create_embedding(query)
            
            results = []
            
            # Search in FAISS first (faster local search)
            if self.faiss_index and self.faiss_index.ntotal > 0:
                # FAISS search
                search_k = min(top_k * 3, self.faiss_index.ntotal)  # Get more for filtering
                scores, indices = self.faiss_index.search(
                    query_embedding.reshape(1, -1).astype('float32'), 
                    search_k
                )
                
                # Process FAISS results
                for score, idx in zip(scores[0], indices[0]):
                    if idx == -1:  # FAISS returns -1 for invalid indices
                        continue
                        
                    metadata = self.talent_metadata.get(idx, {})
                    
                    # Apply filters
                    if filters:
                        if filters.get('location'):
                            if metadata.get('location', '').lower() != filters['location'].lower():
                                continue
                        if filters.get('gender'):
                            if metadata.get('gender', '').lower() != filters['gender'].lower():
                                continue
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
                        'score': float(score),  # FAISS returns float32
                        'location': metadata.get('location'),
                        'skills': skills,
                        'experience': metadata.get('experience'),
                        'gender': metadata.get('gender'),
                        'age': metadata.get('age'),
                        'source': 'faiss'
                    })
                    
                    if len(results) >= top_k:
                        break
            
            # Fallback to Pinecone if not enough results
            if len(results) < top_k and self.index:
                remaining_k = top_k - len(results)
                
                # Build filter dict for Pinecone
                pinecone_filter = {}
                if filters:
                    if filters.get('location'):
                        pinecone_filter['location'] = filters['location']
                    if filters.get('gender'):
                        pinecone_filter['gender'] = filters['gender']
                
                # Query Pinecone
                query_response = self.index.query(
                    vector=query_embedding.tolist(),
                    top_k=remaining_k * 2,  # Get more results for post-filtering
                    include_metadata=True,
                    filter=pinecone_filter if pinecone_filter else None
                )
                
                # Process Pinecone results
                for match in query_response.get('matches', []):
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
                        'age': metadata.get('age'),
                        'source': 'pinecone'
                    })
                    
                    if len(results) >= top_k:
                        break
            
            # Fallback: Return mock results if no vector search is available
            if not results and not self.faiss_index and not self.index:
                logger.warning("No vector search available, returning mock results")
                results = [
                    {
                        'talent_id': f'mock_{i}',
                        'name': f'Talent {i}',
                        'score': 0.9 - (i * 0.05),
                        'location': 'Mumbai',
                        'skills': ['Acting', 'Dancing'],
                        'experience': f'{5 + i} years',
                        'gender': 'Any',
                        'age': str(25 + i),
                        'source': 'mock'
                    }
                    for i in range(min(5, top_k))
                ]
            
            # Sort results by score and limit to top_k
            results = sorted(results, key=lambda x: x['score'], reverse=True)[:top_k]
            
            # Cache results
            if results:
                await cache_service.set_vector_search_results(query, filters, results)
            
            # Update metrics
            search_time = time.time() - start_time
            self.metrics['search_time'].append(search_time)
            
            logger.debug(f"Vector search completed in {search_time:.3f}s, found {len(results)} results")
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching similar talents: {e}")
            return []
    
    async def batch_index_talents(self, talents: List[Dict[str, Any]]) -> int:
        """Index multiple talent profiles at once with batch optimization."""
        start_time = time.time()
        
        try:
            # Prepare texts for batch embedding
            texts = []
            metadata_list = []
            
            for talent in talents:
                # Create text representation
                text_parts = []
                
                if talent.get('name'):
                    text_parts.append(f"Name: {talent['name']}")
                if talent.get('bio'):
                    text_parts.append(f"Bio: {talent['bio']}")
                if talent.get('skills'):
                    skills = talent['skills']
                    if isinstance(skills, list):
                        text_parts.append(f"Skills: {', '.join(skills)}")
                    else:
                        text_parts.append(f"Skills: {skills}")
                if talent.get('experience'):
                    text_parts.append(f"Experience: {talent['experience']}")
                if talent.get('location'):
                    text_parts.append(f"Location: {talent['location']}")
                if talent.get('languages'):
                    langs = talent['languages']
                    if isinstance(langs, list):
                        text_parts.append(f"Languages: {', '.join(langs)}")
                    else:
                        text_parts.append(f"Languages: {langs}")
                
                # Add physical attributes
                if talent.get('gender'):
                    text_parts.append(f"Gender: {talent['gender']}")
                if talent.get('age'):
                    text_parts.append(f"Age: {talent['age']}")
                if talent.get('height'):
                    text_parts.append(f"Height: {talent['height']}")
                
                combined_text = " | ".join(text_parts)
                texts.append(combined_text)
                
                # Prepare metadata
                metadata = {
                    "talent_id": str(talent.get('id', '')),
                    "name": talent.get('name', ''),
                    "location": talent.get('location', ''),
                    "skills": json.dumps(talent.get('skills', [])),
                    "experience": talent.get('experience', ''),
                    "gender": talent.get('gender', ''),
                    "age": str(talent.get('age', 0))
                }
                metadata_list.append(metadata)
            
            # Create embeddings in batch
            embeddings = await self.batch_create_embeddings(texts)
            
            indexed_count = 0
            
            # Batch index in FAISS
            if self.faiss_index and embeddings:
                batch_embeddings = np.array(embeddings).astype('float32')
                start_id = self.faiss_id_counter
                
                self.faiss_index.add(batch_embeddings)
                
                # Store metadata
                for i, metadata in enumerate(metadata_list):
                    self.talent_metadata[start_id + i] = metadata
                
                self.faiss_id_counter += len(embeddings)
                self.metrics['total_vectors'] += len(embeddings)
                indexed_count = len(embeddings)
                
                # Save index periodically
                if self.faiss_id_counter % 100 == 0:
                    await self._save_faiss_index()
            
            # Batch index in Pinecone if available
            if self.index and embeddings:
                vectors_to_upsert = []
                for i, (talent, embedding, metadata) in enumerate(zip(talents, embeddings, metadata_list)):
                    vector_id = self._generate_vector_id(talent)
                    vectors_to_upsert.append({
                        "id": vector_id,
                        "values": embedding.tolist(),
                        "metadata": metadata
                    })
                
                # Batch upsert to Pinecone
                batch_size = 100  # Pinecone batch limit
                for i in range(0, len(vectors_to_upsert), batch_size):
                    batch = vectors_to_upsert[i:i + batch_size]
                    self.index.upsert(vectors=batch)
                
                logger.debug(f"Batch indexed {len(vectors_to_upsert)} talents in Pinecone")
            
            processing_time = time.time() - start_time
            logger.info(f"Batch indexed {indexed_count}/{len(talents)} talents in {processing_time:.2f}s")
            
            return indexed_count
            
        except Exception as e:
            logger.error(f"Error in batch indexing: {e}")
            return 0
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for the vector service."""
        cache_stats = cache_service.get_cache_stats()
        
        avg_embedding_time = np.mean(self.metrics['embedding_time']) if self.metrics['embedding_time'] else 0
        avg_search_time = np.mean(self.metrics['search_time']) if self.metrics['search_time'] else 0
        
        return {
            'total_vectors': self.metrics['total_vectors'],
            'avg_embedding_time_ms': round(avg_embedding_time * 1000, 2),
            'avg_search_time_ms': round(avg_search_time * 1000, 2),
            'cache_hit_rate': cache_stats.get('hit_rate_percent', 0),
            'cache_stats': cache_stats,
            'model_loaded': self.model_loaded,
            'faiss_enabled': self.faiss_index is not None,
            'pinecone_enabled': self.index is not None
        }
    
    async def close(self):
        """Clean up resources."""
        # Save FAISS index
        if self.faiss_index:
            await self._save_faiss_index()
        
        # Close executor
        if self.executor:
            self.executor.shutdown(wait=True)
        
        # Close cache service
        await cache_service.close()
        
        logger.info("Vector service closed")


# Create optimized singleton instance
optimized_vector_service = OptimizedVectorService()
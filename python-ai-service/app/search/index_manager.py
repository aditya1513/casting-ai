"""Real-time index management for keeping search vectors current."""

import asyncio
from typing import List, Dict, Any, Optional, Set
from loguru import logger
from datetime import datetime, timedelta
import json
import hashlib
from collections import defaultdict
import numpy as np

from app.search.pinecone_client import PineconeSearchSystem
from app.search.embedding_pipeline import TalentEmbeddingPipeline
from app.database.connection import async_db
from app.core.config import settings
from celery import Celery


# Celery configuration for background tasks
celery_app = Celery(
    'index_manager',
    broker=settings.celery_broker_url or 'redis://localhost:6379/0',
    backend=settings.celery_result_backend or 'redis://localhost:6379/0'
)


class IndexManager:
    """Manages real-time updates and maintenance of search index."""
    
    def __init__(self):
        """Initialize index management components."""
        self.pinecone_client = PineconeSearchSystem()
        self.embedding_pipeline = TalentEmbeddingPipeline()
        
        # Update tracking
        self.pending_updates = defaultdict(list)
        self.update_batch_size = 50
        self.update_interval = 60  # seconds
        
        # Change detection
        self.profile_hashes = {}
        self.last_check_time = {}
        
        # Performance monitoring
        self.index_stats = {
            "total_vectors": 0,
            "updates_today": 0,
            "last_update": None,
            "last_optimization": None,
            "average_update_time": 0
        }
        
        # Background task flags
        self.monitoring_active = False
        self.optimization_scheduled = False
    
    async def monitor_profile_changes(self):
        """
        Monitor talent profiles for changes and trigger updates.
        Runs continuously in the background.
        """
        try:
            self.monitoring_active = True
            logger.info("Starting profile change monitoring")
            
            while self.monitoring_active:
                try:
                    # Check for recent profile updates
                    recent_changes = await self._detect_profile_changes()
                    
                    if recent_changes:
                        logger.info(f"Detected {len(recent_changes)} profile changes")
                        
                        # Queue updates for processing
                        for change in recent_changes:
                            await self.queue_profile_update(change)
                    
                    # Process pending updates
                    await self.process_pending_updates()
                    
                    # Sleep before next check
                    await asyncio.sleep(self.update_interval)
                    
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    await asyncio.sleep(5)  # Short sleep on error
            
        except Exception as e:
            logger.error(f"Profile monitoring failed: {e}")
        finally:
            self.monitoring_active = False
    
    async def batch_update_embeddings(
        self,
        changes: List[Dict[str, Any]]
    ) -> bool:
        """
        Batch update embeddings for changed profiles.
        
        Args:
            changes: List of profile changes
            
        Returns:
            Success status
        """
        try:
            start_time = datetime.utcnow()
            
            # Group changes by operation type
            updates = []
            deletes = []
            
            for change in changes:
                if change.get("operation") == "delete":
                    deletes.append(change["talent_id"])
                else:
                    updates.append(change)
            
            # Process deletions
            if deletes:
                await self._delete_vectors(deletes)
                logger.info(f"Deleted {len(deletes)} vectors from index")
            
            # Process updates
            if updates:
                # Generate new embeddings
                embeddings_data = []
                
                for change in updates:
                    profile = change.get("profile_data")
                    if profile:
                        try:
                            embedding_result = await self.embedding_pipeline.generate_profile_embedding(
                                profile
                            )
                            embeddings_data.append(embedding_result)
                        except Exception as e:
                            logger.error(f"Failed to generate embedding for {profile.get('id')}: {e}")
                
                # Batch upsert to Pinecone
                if embeddings_data:
                    vectors_to_upsert = []
                    
                    for data in embeddings_data:
                        vectors_to_upsert.append({
                            "id": data["talent_id"],
                            "embedding": data["embedding"],
                            "metadata": data["metadata"]
                        })
                    
                    success = await self.pinecone_client.batch_upsert(vectors_to_upsert)
                    
                    if success:
                        logger.info(f"Successfully updated {len(vectors_to_upsert)} embeddings")
                    else:
                        logger.error("Batch embedding update failed")
                        return False
            
            # Update statistics
            elapsed_time = (datetime.utcnow() - start_time).total_seconds()
            await self._update_statistics(len(changes), elapsed_time)
            
            return True
            
        except Exception as e:
            logger.error(f"Batch embedding update failed: {e}")
            return False
    
    async def reindex_on_major_changes(self):
        """
        Trigger full reindexing when major structural changes occur.
        """
        try:
            logger.info("Starting full reindexing process")
            
            # Get all talent profiles from database
            profiles = await self._get_all_talent_profiles()
            
            if not profiles:
                logger.warning("No profiles found for reindexing")
                return False
            
            logger.info(f"Reindexing {len(profiles)} talent profiles")
            
            # Process in batches
            batch_size = 100
            total_processed = 0
            
            for i in range(0, len(profiles), batch_size):
                batch = profiles[i:i + batch_size]
                
                # Generate embeddings for batch
                embeddings = await self.embedding_pipeline.batch_generate_embeddings(
                    batch,
                    batch_size=10
                )
                
                # Prepare for upsert
                vectors_data = []
                for embedding_data in embeddings:
                    vectors_data.append({
                        "id": embedding_data["talent_id"],
                        "embedding": embedding_data["embedding"],
                        "metadata": embedding_data["metadata"]
                    })
                
                # Upsert to Pinecone
                await self.pinecone_client.batch_upsert(vectors_data)
                
                total_processed += len(batch)
                logger.info(f"Reindexed {total_processed}/{len(profiles)} profiles")
            
            # Update index statistics
            self.index_stats["last_optimization"] = datetime.utcnow()
            self.index_stats["total_vectors"] = len(profiles)
            
            logger.info("Full reindexing completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Reindexing failed: {e}")
            return False
    
    async def archive_inactive_profiles(self):
        """
        Archive profiles that have been inactive for extended periods.
        """
        try:
            # Define inactivity threshold
            inactive_threshold = datetime.utcnow() - timedelta(days=365)  # 1 year
            
            # Query for inactive profiles
            inactive_profiles = await self._get_inactive_profiles(inactive_threshold)
            
            if not inactive_profiles:
                logger.info("No inactive profiles to archive")
                return 0
            
            logger.info(f"Found {len(inactive_profiles)} inactive profiles to archive")
            
            # Archive profiles (move to separate namespace or delete)
            archived_count = 0
            
            for profile in inactive_profiles:
                try:
                    # Option 1: Delete from main index
                    await self.pinecone_client.delete_stale_vectors({
                        "inactive_days": 365,
                        "talent_id": profile["id"]
                    })
                    
                    # Option 2: Move to archive namespace (if using namespaces)
                    # await self._move_to_archive(profile)
                    
                    # Update database status
                    await self._update_profile_status(profile["id"], "archived")
                    
                    archived_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to archive profile {profile['id']}: {e}")
            
            logger.info(f"Successfully archived {archived_count} profiles")
            return archived_count
            
        except Exception as e:
            logger.error(f"Profile archiving failed: {e}")
            return 0
    
    async def optimize_index_performance(self):
        """
        Optimize index for better search performance.
        """
        try:
            logger.info("Starting index optimization")
            
            # Get current index stats
            stats = await self.pinecone_client.get_index_stats()
            logger.info(f"Current index stats: {stats}")
            
            # Step 1: Remove duplicate vectors
            duplicates_removed = await self._remove_duplicate_vectors()
            logger.info(f"Removed {duplicates_removed} duplicate vectors")
            
            # Step 2: Compact sparse vectors
            await self._compact_sparse_vectors()
            
            # Step 3: Update frequently accessed vectors
            await self._optimize_hot_vectors()
            
            # Step 4: Rebalance index distribution
            await self._rebalance_index()
            
            # Update optimization timestamp
            self.index_stats["last_optimization"] = datetime.utcnow()
            
            # Get updated stats
            new_stats = await self.pinecone_client.get_index_stats()
            logger.info(f"Optimization complete. New stats: {new_stats}")
            
            return True
            
        except Exception as e:
            logger.error(f"Index optimization failed: {e}")
            return False
    
    async def backup_index_daily(self):
        """
        Create daily backup of index metadata.
        """
        try:
            logger.info("Starting daily index backup")
            
            # Get all vector IDs and metadata
            backup_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "index_name": self.pinecone_client.index_name,
                "total_vectors": 0,
                "metadata": []
            }
            
            # Query index for all vectors (in batches)
            # Note: This is simplified - in production, you'd paginate through all vectors
            sample_results = await self.pinecone_client.hybrid_search(
                query_embedding=[0] * 1536,  # Dummy query
                top_k=1000,
                include_metadata=True
            )
            
            for result in sample_results:
                backup_data["metadata"].append({
                    "id": result["id"],
                    "metadata": result.get("metadata", {}),
                    "score": result.get("score", 0)
                })
            
            backup_data["total_vectors"] = len(backup_data["metadata"])
            
            # Save backup to file or cloud storage
            backup_filename = f"index_backup_{datetime.utcnow().strftime('%Y%m%d')}.json"
            await self._save_backup(backup_filename, backup_data)
            
            logger.info(f"Index backup completed: {backup_filename}")
            return True
            
        except Exception as e:
            logger.error(f"Index backup failed: {e}")
            return False
    
    async def queue_profile_update(self, change: Dict[str, Any]):
        """
        Queue a profile update for processing.
        
        Args:
            change: Profile change information
        """
        try:
            talent_id = change.get("talent_id")
            if not talent_id:
                return
            
            # Add to pending updates
            self.pending_updates[talent_id].append({
                "change": change,
                "timestamp": datetime.utcnow(),
                "priority": change.get("priority", "normal")
            })
            
            # If high priority, process immediately
            if change.get("priority") == "high":
                await self.process_pending_updates(force=True)
            
        except Exception as e:
            logger.error(f"Failed to queue profile update: {e}")
    
    async def process_pending_updates(self, force: bool = False):
        """
        Process pending profile updates.
        
        Args:
            force: Process immediately regardless of batch size
        """
        try:
            if not self.pending_updates:
                return
            
            # Check if we should process
            total_pending = sum(len(updates) for updates in self.pending_updates.values())
            
            if not force and total_pending < self.update_batch_size:
                return
            
            logger.info(f"Processing {total_pending} pending updates")
            
            # Collect updates to process
            updates_to_process = []
            
            for talent_id, updates in list(self.pending_updates.items()):
                # Take the most recent update for each talent
                if updates:
                    latest_update = max(updates, key=lambda x: x["timestamp"])
                    updates_to_process.append(latest_update["change"])
                    
                    # Clear processed updates
                    del self.pending_updates[talent_id]
            
            # Process batch
            if updates_to_process:
                await self.batch_update_embeddings(updates_to_process)
            
        except Exception as e:
            logger.error(f"Failed to process pending updates: {e}")
    
    # Helper methods
    
    async def _detect_profile_changes(self) -> List[Dict[str, Any]]:
        """Detect recent changes in talent profiles."""
        try:
            # Query database for recently modified profiles
            cutoff_time = datetime.utcnow() - timedelta(minutes=5)
            
            # TODO: Replace with actual database query
            # For now, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Failed to detect profile changes: {e}")
            return []
    
    async def _delete_vectors(self, talent_ids: List[str]):
        """Delete vectors from index."""
        try:
            # Delete from Pinecone
            self.pinecone_client.index.delete(ids=talent_ids)
            logger.info(f"Deleted {len(talent_ids)} vectors")
            
        except Exception as e:
            logger.error(f"Failed to delete vectors: {e}")
    
    async def _update_statistics(self, update_count: int, elapsed_time: float):
        """Update index management statistics."""
        try:
            self.index_stats["updates_today"] += update_count
            self.index_stats["last_update"] = datetime.utcnow()
            
            # Update average update time
            if self.index_stats["average_update_time"] == 0:
                self.index_stats["average_update_time"] = elapsed_time
            else:
                # Moving average
                self.index_stats["average_update_time"] = (
                    self.index_stats["average_update_time"] * 0.9 + elapsed_time * 0.1
                )
            
        except Exception as e:
            logger.error(f"Failed to update statistics: {e}")
    
    async def _get_all_talent_profiles(self) -> List[Dict[str, Any]]:
        """Get all talent profiles from database."""
        try:
            # TODO: Implement actual database query
            # For now, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Failed to get talent profiles: {e}")
            return []
    
    async def _get_inactive_profiles(
        self,
        threshold: datetime
    ) -> List[Dict[str, Any]]:
        """Get profiles inactive since threshold date."""
        try:
            # TODO: Implement actual database query
            return []
            
        except Exception as e:
            logger.error(f"Failed to get inactive profiles: {e}")
            return []
    
    async def _update_profile_status(self, talent_id: str, status: str):
        """Update profile status in database."""
        try:
            # TODO: Implement actual database update
            pass
            
        except Exception as e:
            logger.error(f"Failed to update profile status: {e}")
    
    async def _remove_duplicate_vectors(self) -> int:
        """Remove duplicate vectors from index."""
        try:
            # TODO: Implement duplicate detection and removal
            return 0
            
        except Exception as e:
            logger.error(f"Failed to remove duplicate vectors: {e}")
            return 0
    
    async def _compact_sparse_vectors(self):
        """Compact sparse vectors for better performance."""
        try:
            # TODO: Implement vector compaction
            pass
            
        except Exception as e:
            logger.error(f"Failed to compact vectors: {e}")
    
    async def _optimize_hot_vectors(self):
        """Optimize frequently accessed vectors."""
        try:
            # TODO: Implement hot vector optimization
            pass
            
        except Exception as e:
            logger.error(f"Failed to optimize hot vectors: {e}")
    
    async def _rebalance_index(self):
        """Rebalance index distribution."""
        try:
            # TODO: Implement index rebalancing
            pass
            
        except Exception as e:
            logger.error(f"Failed to rebalance index: {e}")
    
    async def _save_backup(self, filename: str, data: Dict[str, Any]):
        """Save backup data to storage."""
        try:
            # TODO: Implement backup storage (S3, GCS, etc.)
            # For now, save locally
            import aiofiles
            
            async with aiofiles.open(f"/tmp/{filename}", "w") as f:
                await f.write(json.dumps(data, indent=2))
            
        except Exception as e:
            logger.error(f"Failed to save backup: {e}")


# Celery tasks for background processing

@celery_app.task
def update_embeddings_task(changes: List[Dict[str, Any]]):
    """Celery task for updating embeddings in background."""
    try:
        manager = IndexManager()
        asyncio.run(manager.batch_update_embeddings(changes))
        return f"Updated {len(changes)} embeddings"
    except Exception as e:
        logger.error(f"Celery task failed: {e}")
        raise


@celery_app.task
def optimize_index_task():
    """Celery task for index optimization."""
    try:
        manager = IndexManager()
        asyncio.run(manager.optimize_index_performance())
        return "Index optimization completed"
    except Exception as e:
        logger.error(f"Celery optimization task failed: {e}")
        raise


@celery_app.task
def daily_backup_task():
    """Celery task for daily backup."""
    try:
        manager = IndexManager()
        asyncio.run(manager.backup_index_daily())
        return "Daily backup completed"
    except Exception as e:
        logger.error(f"Celery backup task failed: {e}")
        raise


@celery_app.task
def archive_inactive_task():
    """Celery task for archiving inactive profiles."""
    try:
        manager = IndexManager()
        count = asyncio.run(manager.archive_inactive_profiles())
        return f"Archived {count} inactive profiles"
    except Exception as e:
        logger.error(f"Celery archive task failed: {e}")
        raise


# Schedule periodic tasks
celery_app.conf.beat_schedule = {
    'optimize-index-daily': {
        'task': 'app.search.index_manager.optimize_index_task',
        'schedule': 86400.0,  # Daily
    },
    'backup-index-daily': {
        'task': 'app.search.index_manager.daily_backup_task',
        'schedule': 86400.0,  # Daily
    },
    'archive-inactive-weekly': {
        'task': 'app.search.index_manager.archive_inactive_task',
        'schedule': 604800.0,  # Weekly
    },
}
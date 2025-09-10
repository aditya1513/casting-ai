"""Database connection and session management."""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from contextlib import contextmanager
import asyncpg
from typing import AsyncGenerator, Generator
from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    poolclass=NullPool,  # Use NullPool for better compatibility
    echo=settings.debug
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session.
    
    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database session.
    
    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


class AsyncDatabase:
    """Async database connection manager."""
    
    def __init__(self):
        self.pool = None
    
    async def connect(self):
        """Create async connection pool."""
        self.pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=10,
            max_size=20,
            command_timeout=60
        )
    
    async def disconnect(self):
        """Close async connection pool."""
        if self.pool:
            await self.pool.close()
    
    async def fetch_one(self, query: str, *args):
        """Execute query and fetch one result."""
        async with self.pool.acquire() as connection:
            return await connection.fetchrow(query, *args)
    
    async def fetch_all(self, query: str, *args):
        """Execute query and fetch all results."""
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, *args)
    
    async def execute(self, query: str, *args):
        """Execute query without returning results."""
        async with self.pool.acquire() as connection:
            return await connection.execute(query, *args)


# Create global async database instance
async_db = AsyncDatabase()